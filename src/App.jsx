import { useState, useMemo, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SplashScreen from "./components/SplashScreen";
import AdminPanel from "./pages/AdminPanel";
import PublicDashboard from "./pages/PublicDashboard";
import AdminLogin from "./components/AdminLogin";
import { DUMP_POINTS as MOCK_POINTS, RAW_REPORTS as MOCK_REPORTS, TEAMS as INITIAL_TEAMS, MOCK_FEEDBACKS } from "./data/mockData";
import { db, auth } from "./services/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const TODAY = new Date();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState("rawfeed");
  
  // Auth State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Real-time Data States
  const [fbPoints, setFbPoints] = useState([]);
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [resolvedOverrides, setResolvedOverrides] = useState({});

  // Subscribe to Firebase Authentication State
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = useCallback(async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Sign out error:", err);
      }
    }
    setUser(null);
  }, []);

  const points = useMemo(() => {
    return [...MOCK_POINTS, ...fbPoints].map(p => {
      const safeReportId = p.report_id || p.community_id || p.id;
      const patched = { ...p, report_id: safeReportId };
      if (resolvedOverrides[p.id]) {
        return { ...patched, status: "resolved", resolved_at: resolvedOverrides[p.id] };
      }
      return patched;
    });
  }, [fbPoints, resolvedOverrides]);

  // Filter States
  const [timeFilter, setTimeFilter] = useState("all"); 
  const [severityFilter, setSeverityFilter] = useState("all");

  // Team Assignments State
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [teamAssignments, setTeamAssignments] = useState({});

  // Feedback & Resolve State
  const [feedbacks, setFeedbacks] = useState(MOCK_FEEDBACKS);
  // resolving: Set of pointIds currently being processed (shows spinner)
  const [resolvingIds, setResolvingIds] = useState(new Set());

  // Subscribe to Firebase if configured
  useEffect(() => {
    if (!db) {
      console.warn("[Dashboard] Firebase Firestore not initialized. Using mock data.");
      return;
    }

    console.log("[Dashboard] Firebase initialized");
    console.log("[Dashboard] Firestore project: nagarnetra-4a55d");
    console.log("[Dashboard] dumpPoints listener attached");
    
    const unsubPoints = onSnapshot(collection(db, "dumpPoints"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`[Dashboard] dumpPoints received: ${data.length}`);
      setFbPoints(data);
    }, (err) => {
      console.warn("[Dashboard] dumpPoints listener error:", err.message);
    });

    let unsubReports = () => {};
    let unsubFeedback = () => {};

    // Only subscribe to private PII collections (reports & feedback) if authenticated as Admin
    if (user) {
      console.log("[Dashboard] reports listener attached");
      unsubReports = onSnapshot(collection(db, "reports"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`[Dashboard] reports received: ${data.length}`);
        setReports([...MOCK_REPORTS, ...data]);
      }, (err) => console.warn("[Dashboard] reports listener permission notice:", err.message));

      unsubFeedback = onSnapshot(collection(db, "feedback"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFeedbacks([...MOCK_FEEDBACKS, ...data]);
      }, (err) => console.warn("[Dashboard] feedback listener permission notice:", err.message));
    }

    return () => {
      unsubPoints();
      unsubReports();
      unsubFeedback();
    };
  }, [user]);

  // ── Resolve Handler ────────────────────────────────────────────────────────
  const handleResolve = useCallback((pointId) => {
    const point = points.find(p => p.id === pointId);
    if (!point || point.status !== "active") return;

    // 1. Add to resolving set (disables button, shows spinner)
    setResolvingIds(prev => new Set([...prev, pointId]));

    // 2. Mark as resolved immediately
    const resolvedDate = new Date().toISOString().split('T')[0];
    
    if (pointId.startsWith("dp_")) {
      // It's a mock point, apply local override
      setResolvedOverrides(prev => ({ ...prev, [pointId]: resolvedDate }));
    } else {
      // It's a real point, push to Firestore
      if (db) {
        const pointRef = doc(db, "dumpPoints", pointId);
        updateDoc(pointRef, { status: "resolved", resolved_at: resolvedDate }).catch(console.error);
      }
      // Apply local override to show immediate feedback before Firestore sync
      setResolvedOverrides(prev => ({ ...prev, [pointId]: resolvedDate }));
    }

    // Find all phone numbers associated with this point
    const relatedReports = reports.filter(r => r.matched_point_id === pointId);
    const phoneNumbers = [...new Set(relatedReports.map(r => r.phone_number).filter(Boolean))];
    
    // Fallback for demo purposes if no real numbers exist (but try not to use the sandbox number as To)
    const targetNumbers = phoneNumbers.length > 0 ? phoneNumbers : [];

    // Trigger the real WhatsApp webhook if there are phone numbers
    if (targetNumbers.length > 0) {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const webhookUrl = import.meta.env.DEV 
        ? `http://127.0.0.1:5001/${projectId}/us-central1/sendFeedbackSurvey`
        : `https://sendfeedbacksurvey-5hbpammmqa-uc.a.run.app`;

      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pointId,
          reportId: point.community_id,
          pointName: point.name,
          phoneNumbers: targetNumbers
        })
      }).catch(err => console.error("Webhook trigger failed:", err));
    }

    // 3. Remove from resolving set after 1 second (gives UI time to show spinner)
    setTimeout(() => {
      setResolvingIds(prev => {
        const next = new Set(prev);
        next.delete(pointId);
        return next;
      });
    }, 1000);
  }, [points, reports]);

  // 1. Filter the data
  const { filteredPoints, filteredReports } = useMemo(() => {
    let timeLimit = null;
    if (timeFilter === "30d") timeLimit = new Date(TODAY.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (timeFilter === "7d") timeLimit = new Date(TODAY.getTime() - 7 * 24 * 60 * 60 * 1000);

    const fPoints = points.filter(p => {
      if (timeLimit) {
        if (!p.last_reported) return false;
        const reportedDate = new Date(p.last_reported);
        if (isNaN(reportedDate.getTime()) || reportedDate < timeLimit) return false;
      }
      if (severityFilter === "high" && p.report_count < 7) return false;
      if (severityFilter === "med" && (p.report_count < 3 || p.report_count >= 7)) return false;
      if (severityFilter === "low" && p.report_count >= 3) return false;
      return true;
    });

    const fReports = reports.filter(r => {
      if (timeLimit) {
        if (!r.timestamp) return false;
        const reportDate = new Date(r.timestamp);
        if (isNaN(reportDate.getTime()) || reportDate < timeLimit) return false;
      }
      if (severityFilter !== "all") {
        if (!r.matched_point_id) return false;
        const linkedPoint = points.find(dp => dp.id === r.matched_point_id);
        if (!linkedPoint) return false;
        
        if (severityFilter === "high" && linkedPoint.report_count < 7) return false;
        if (severityFilter === "med" && (linkedPoint.report_count < 3 || linkedPoint.report_count >= 7)) return false;
        if (severityFilter === "low" && linkedPoint.report_count >= 3) return false;
      }
      return true;
    });

    return { filteredPoints: fPoints, filteredReports: fReports };
  }, [points, reports, timeFilter, severityFilter]);

  // 2. Compute dynamic stats
  const dynamicStats = useMemo(() => {
    const activePoints = filteredPoints.filter(d => d.status === "active").length;
    const todayStr = TODAY.toISOString().split("T")[0];
    const newToday = filteredPoints.filter(d => d.last_reported && d.last_reported.startsWith(todayStr)).length;
    
    const weekAgo = new Date(TODAY.getTime() - 7 * 24 * 60 * 60 * 1000);
    const reportsThisWeek = filteredReports.filter(r => r.timestamp && new Date(r.timestamp) >= weekAgo).length;
    
    let avgDaysActive = 0;
    if (filteredPoints.length > 0) {
      avgDaysActive = Math.round(
        filteredPoints.reduce((sum, d) => {
          const first = d.first_reported ? new Date(d.first_reported) : TODAY;
          const last = d.last_reported ? new Date(d.last_reported) : TODAY;
          return sum + ((last - first) / (1000 * 60 * 60 * 24));
        }, 0) / filteredPoints.length
      );
    }

    return { activePoints, newToday, reportsThisWeek, avgDaysActive };
  }, [filteredPoints, filteredReports]);


  const hostname = window.location.hostname;
  const isPublicDomain = hostname.includes('swachhos-public');
  const isAdminDomain = hostname.includes('swachhos-admin');

  const publicElement = (
    <PublicDashboard 
      points={filteredPoints} 
      reports={filteredReports} 
      stats={dynamicStats}
      timeFilter={timeFilter}
      setTimeFilter={setTimeFilter}
      severityFilter={severityFilter}
      setSeverityFilter={setSeverityFilter}
    />
  );

  const adminElement = authLoading ? (
    <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white font-medium">
      Authenticating NagarNetra Portal...
    </div>
  ) : !user ? (
    <AdminLogin onLoginSuccess={(u) => setUser(u)} onCancel={() => window.location.href = "/"} />
  ) : (
    <AdminPanel 
      dynamicStats={dynamicStats}
      timeFilter={timeFilter}
      setTimeFilter={setTimeFilter}
      severityFilter={severityFilter}
      setSeverityFilter={setSeverityFilter}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      filteredPoints={filteredPoints}
      filteredReports={filteredReports}
      teamAssignments={teamAssignments}
      setTeamAssignments={setTeamAssignments}
      teams={teams}
      setTeams={setTeams}
      onResolve={handleResolve}
      resolvingIds={resolvingIds}
      feedbacks={feedbacks}
      user={user}
      onLogout={handleLogout}
    />
  );

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (isPublicDomain) {
    return (
      <Router>
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <Routes>
          <Route path="/*" element={publicElement} />
        </Routes>
      </Router>
    );
  }

  if (isAdminDomain) {
    return (
      <Router>
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <Routes>
          <Route path="/*" element={adminElement} />
        </Routes>
      </Router>
    );
  }

  // Default behavior for localhost or unspecified domains
  return (
    <Router>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <Routes>
        <Route path="/" element={publicElement} />
        <Route path="/admin" element={adminElement} />
      </Routes>
    </Router>
  );
}

