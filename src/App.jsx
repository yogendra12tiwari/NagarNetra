import { useState, useMemo, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SplashScreen from "./components/SplashScreen";
import AdminPanel from "./pages/AdminPanel";
import PublicDashboard from "./pages/PublicDashboard";
import AdminLogin from "./components/AdminLogin";
import {
  ROAD_HAZARDS,
  HAZARD_TEAMS,
  DUMP_POINTS as MOCK_POINTS,
  RAW_REPORTS as MOCK_REPORTS,
  MOCK_FEEDBACKS
} from "./data/mockData";
import { db, auth } from "./services/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const TODAY = new Date();
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://nagarnetra-74tc.onrender.com";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState("rawfeed");

  // Auth State
  const [user, setUser] = useState(null);

  // Road Hazards Data States
  const [fbHazards, setFbHazards] = useState([]);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [dataSource, setDataSource] = useState(!db ? "mock" : "loading");
  const [, setDataError] = useState(null);

  // Legacy Data States (Preserved for backwards compatibility)
  const [fbPoints, setFbPoints] = useState([]);
  const [fbReports, setFbReports] = useState([]);
  const [resolvedOverrides, setResolvedOverrides] = useState({});

  // Filter States
  const [timeFilter, setTimeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Hazard Team Assignments State
  const [teams, setTeams] = useState(HAZARD_TEAMS);
  const [teamAssignments, setTeamAssignments] = useState({});

  // Feedback & Action State
  const [feedbacks, setFeedbacks] = useState(MOCK_FEEDBACKS);
  const [resolvingIds, setResolvingIds] = useState(new Set());

  // Subscribe to Firebase Authentication State
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
    window.location.href = "/";
  }, []);

  // Subscribe to Firestore collections
  useEffect(() => {
    if (!db) {
      console.warn("[SI-02] Firestore not initialized. Using offline mock datasets.");
      return;
    }

    console.log("[SI-02] Attaching real-time Firestore listeners");

    // 1. Primary: Real-time listener on canonical "hazards" collection
    const unsubHazards = onSnapshot(collection(db, "hazards"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log(`[SI-02] Hazards snapshot: ${data.length} documents received.`);
      setFbHazards(data);
      setDataSource(data.length > 0 ? "live" : "empty");
      setDataError(null);
    }, (err) => {
      console.warn("[SI-02] hazards listener notice:", err.message);
      setDataError(err.message);
      setFbHazards(prev => {
        if (prev.length === 0) setDataSource("mock");
        return prev;
      });
    });

    // 2. Secondary: Backend API sync for hazards (proxy support)
    fetch(`${BACKEND_URL}/api/hazards`)
      .then(res => res.json())
      .then(result => {
        if (result.ok && Array.isArray(result.hazards) && result.hazards.length > 0) {
          console.log(`[SI-02] Synced ${result.hazards.length} hazards via backend proxy`);
          setFbHazards(prev => {
            const map = new Map();
            [...prev, ...result.hazards].forEach(h => map.set(h.id || h.ticket_id, h));
            return Array.from(map.values());
          });
          setDataSource("live");
        }
      })
      .catch(e => console.warn("[SI-02] Backend hazards sync notice:", e.message));

    // 3. Legacy listener on dumpPoints (preserves legacy garbage data)
    const unsubPoints = onSnapshot(collection(db, "dumpPoints"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFbPoints(data);
    }, (err) => {
      console.warn("[SI-02] dumpPoints listener notice:", err.message);
    });

    // 4. Legacy listener on reports
    const unsubReports = onSnapshot(collection(db, "reports"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFbReports(prev => {
        const map = new Map();
        [...prev, ...data].forEach(r => map.set(r.report_id || r.id, r));
        return Array.from(map.values());
      });
    }, (err) => {
      console.warn("[SI-02] reports listener notice:", err.message);
    });

    return () => {
      unsubHazards();
      unsubPoints();
      unsubReports();
    };
  }, []);

  // Unified Canonical Road Hazards list
  const hazards = useMemo(() => {
    let baseList = fbHazards.length > 0 ? fbHazards : ROAD_HAZARDS;
    return baseList.map(h => {
      const override = statusOverrides[h.id] || (h.ticket_id && statusOverrides[h.ticket_id]);
      if (override) {
        return { ...h, ...override };
      }
      return h;
    });
  }, [fbHazards, statusOverrides, dataSource]);

  // Unified Legacy Points list
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

  // Unified Reports list
  const reports = useMemo(() => {
    return [...fbReports, ...MOCK_REPORTS];
  }, [fbReports]);

  // ── Hazard Status Update Handler ──────────────────────────────────────────
  const handleUpdateHazardStatus = useCallback(async (hazardId, newStatus, notes) => {
    if (!hazardId || !newStatus) return false;

    const timestamp = new Date().toISOString();
    const updatePayload = {
      status: newStatus,
      updated_at: timestamp,
    };
    if (newStatus === "resolved") {
      updatePayload.resolved_at = timestamp;
    }
    if (notes) {
      updatePayload.notes = notes;
    }

    let writeSucceeded = false;

    // Retrieve Firebase ID Token if user is authenticated
    let idToken = null;
    if (auth?.currentUser) {
      try {
        idToken = await auth.currentUser.getIdToken();
      } catch (tokenErr) {
        console.warn("[SI-02] Error fetching ID token:", tokenErr.message);
      }
    }

    // 1. Primary: Secure Backend API with verified Admin credentials
    try {
      const headers = { "Content-Type": "application/json" };
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }
      const res = await fetch(`${BACKEND_URL}/api/hazards/${hazardId}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus, notes })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.ok) {
          writeSucceeded = true;
          console.log(`[SI-02] Hazard ${hazardId} updated via authorized backend API`);
        }
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.warn(`[SI-02] Backend update rejected (${res.status}):`, errBody.error || res.statusText);
      }
    } catch (apiErr) {
      console.warn("[SI-02] Backend status proxy network notice:", apiErr.message);
    }

    // 2. Secondary: Direct Firestore update restricted by admin security rules
    if (!writeSucceeded && db && auth?.currentUser) {
      try {
        const hazardRef = doc(db, "hazards", hazardId);
        await updateDoc(hazardRef, updatePayload);
        writeSucceeded = true;
        console.log(`[SI-02] Hazard ${hazardId} updated to ${newStatus} in Firestore directly`);
      } catch (err) {
        console.warn("[SI-02] Direct Firestore update rejected by rules:", err.message);
      }
    }

    // 3. Fallback for offline demo mode ONLY (when Firebase is completely unconfigured)
    if (!db && !writeSucceeded) {
      writeSucceeded = true;
    }

    if (writeSucceeded) {
      setStatusOverrides(prev => ({
        ...prev,
        [hazardId]: updatePayload,
      }));
      return true;
    } else {
      console.error(`[SI-02] Administrative write rejected for hazard ${hazardId}`);
      alert(`Authorization Failed: Hazard ${hazardId} could not be updated. Administrator privileges required.`);
      return false;
    }
  }, []);

  // ── Repair Verification Handlers ──────────────────────────────────────────
  const handleVerifyRepair = useCallback(async (hazardId, base64Data, mimeType) => {
    if (!hazardId || !base64Data) return { ok: false, error: "Missing required photo data" };

    let idToken = null;
    if (auth?.currentUser) {
      try {
        idToken = await auth.currentUser.getIdToken();
      } catch (err) {
        console.warn("[SI-02] Error fetching ID token:", err.message);
      }
    }

    try {
      const headers = { "Content-Type": "application/json" };
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

      const res = await fetch(`${BACKEND_URL}/api/hazards/${hazardId}/verify-repair`, {
        method: "POST",
        headers,
        body: JSON.stringify({ base64: base64Data, mimetype: mimeType || "image/jpeg" })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusOverrides(prev => ({
          ...prev,
          [hazardId]: {
            ...prev[hazardId],
            repair_photo_url: data.repair_photo_url,
            verification_status: data.verification_status,
            verification_confidence: data.confidence,
            verification_explanation: data.explanation,
            needs_human_review: data.needs_human_review,
            status: data.status,
          }
        }));
        return { ok: true, data };
      } else {
        alert(`Verification Failed: ${data.error || "Server rejected submission"}`);
        return { ok: false, error: data.error };
      }
    } catch (err) {
      console.error("[SI-02] Network error during repair verification:", err.message);
      alert(`Network Error: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }, []);

  const handleManualVerify = useCallback(async (hazardId, decision, notes) => {
    if (!hazardId || !decision) return { ok: false };

    let idToken = null;
    if (auth?.currentUser) {
      try {
        idToken = await auth.currentUser.getIdToken();
      } catch (err) {
        console.warn("[SI-02] Error fetching ID token:", err.message);
      }
    }

    try {
      const headers = { "Content-Type": "application/json" };
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

      const res = await fetch(`${BACKEND_URL}/api/hazards/${hazardId}/manual-verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({ decision, notes })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusOverrides(prev => ({
          ...prev,
          [hazardId]: {
            ...prev[hazardId],
            verification_status: data.verification_status,
            status: data.status,
            needs_human_review: false,
          }
        }));
        return { ok: true, data };
      } else {
        alert(`Manual Override Failed: ${data.error || "Server rejected request"}`);
        return { ok: false, error: data.error };
      }
    } catch (err) {
      alert(`Network Error: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }, []);

  // Legacy resolve handler
  const handleResolve = useCallback((pointId) => {
    setResolvingIds(prev => new Set([...prev, pointId]));
    const resolvedDate = new Date().toISOString().split("T")[0];

    // Check if it's a hazard or a dump point
    const matchingHazard = hazards.find(h => h.id === pointId || h.ticket_id === pointId);
    if (matchingHazard) {
      handleUpdateHazardStatus(pointId, "resolved");
    } else {
      setResolvedOverrides(prev => ({ ...prev, [pointId]: resolvedDate }));
      if (db && !pointId.startsWith("dp_")) {
        const pointRef = doc(db, "dumpPoints", pointId);
        updateDoc(pointRef, { status: "resolved", resolved_at: resolvedDate }).catch(console.error);
      }
    }

    setTimeout(() => {
      setResolvingIds(prev => {
        const next = new Set(prev);
        next.delete(pointId);
        return next;
      });
    }, 800);
  }, [hazards, handleUpdateHazardStatus]);

  // ── Multi-criteria Filtering ──────────────────────────────────────────────
  const filteredHazards = useMemo(() => {
    let timeLimit = null;
    if (timeFilter === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      timeLimit = startOfDay;
    } else if (timeFilter === "7d") {
      timeLimit = new Date(TODAY.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeFilter === "30d") {
      timeLimit = new Date(TODAY.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return hazards.filter(h => {
      // Time Filter
      if (timeLimit) {
        const dStr = h.created_at || h.last_reported || h.first_reported;
        if (!dStr) return false;
        const d = new Date(dStr);
        if (isNaN(d.getTime()) || d < timeLimit) return false;
      }

      // Priority Filter (Quartiles: Critical 75–100, High 50–74, Med 25–49, Low 1–24)
      const score = typeof h.risk_score === "number" ? h.risk_score : 50;
      const priority = h.priority_label || (score >= 75 ? "Critical" : score >= 50 ? "High" : score >= 25 ? "Medium" : "Low");
      if (priorityFilter === "critical" && priority !== "Critical" && score < 75) return false;
      if (priorityFilter === "high" && priority !== "High" && (score < 50 || score >= 75)) return false;
      if (priorityFilter === "med" && priority !== "Medium" && (score < 25 || score >= 50)) return false;
      if (priorityFilter === "low" && priority !== "Low" && score >= 25) return false;

      // Category Filter
      if (categoryFilter !== "all" && h.hazard_type !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [hazards, timeFilter, priorityFilter, categoryFilter]);

  // Legacy filteredPoints
  const filteredPoints = useMemo(() => {
    return points.filter(p => {
      if (priorityFilter === "critical" && (p.report_count || 0) < 7) return false;
      if (priorityFilter === "high" && ((p.report_count || 0) < 3 || (p.report_count || 0) >= 7)) return false;
      if (priorityFilter === "low" && (p.report_count || 0) >= 3) return false;
      return true;
    });
  }, [points, priorityFilter]);

  // Dynamic Dashboard KPIs (matching reference design)
  const dynamicStats = useMemo(() => {
    const activeHazards = filteredHazards.filter(h => h.status !== "resolved").length;
    const criticalHazards = filteredHazards.filter(h => h.status !== "resolved" && ((h.risk_score || 0) >= 75 || h.priority_label === "Critical")).length;
    const highHazards = filteredHazards.filter(h => h.status !== "resolved" && (((h.risk_score || 0) >= 50 && (h.risk_score || 0) < 75) || h.priority_label === "High")).length;
    const mediumHazards = filteredHazards.filter(h => h.status !== "resolved" && (((h.risk_score || 0) >= 25 && (h.risk_score || 0) < 50) || h.priority_label === "Medium")).length;
    const lowHazards = filteredHazards.filter(h => h.status !== "resolved" && ((h.risk_score || 0) < 25 || h.priority_label === "Low")).length;
    const pendingReview = filteredHazards.filter(h => h.needs_human_review || h.hazard_type === "unrelated_or_uncertain").length;
    const resolvedCount = filteredHazards.filter(h => h.status === "resolved").length;

    const todayStr = TODAY.toISOString().split("T")[0];
    const newToday = filteredHazards.filter(h => {
      const d = h.created_at || h.last_reported;
      return d && d.startsWith(todayStr);
    }).length;

    return {
      activeHazards,
      criticalHazards,
      highHazards,
      mediumHazards,
      lowHazards,
      pendingReview,
      resolvedCount,
      activePoints: activeHazards, // legacy alias
      newToday,
    };
  }, [filteredHazards]);

  const hostname = window.location.hostname;
  const isPublicDomain = hostname.includes("swachhos-public");
  const isAdminDomain = hostname.includes("swachhos-admin");

  const publicElement = (
    <PublicDashboard
      hazards={filteredHazards}
      points={filteredPoints}
      reports={reports}
      stats={dynamicStats}
      timeFilter={timeFilter}
      setTimeFilter={setTimeFilter}
      priorityFilter={priorityFilter}
      setPriorityFilter={setPriorityFilter}
      categoryFilter={categoryFilter}
      setCategoryFilter={setCategoryFilter}
    />
  );

  const adminElement = !user ? (
    <AdminLogin
      onLoginSuccess={(u) => setUser(u)}
      onBypassLogin={() => setUser({ email: "admin@nagarnetra.gov.in" })}
      onCancel={() => window.location.href = "/"}
    />
  ) : (
    <AdminPanel
      dynamicStats={dynamicStats}
      timeFilter={timeFilter}
      setTimeFilter={setTimeFilter}
      priorityFilter={priorityFilter}
      setPriorityFilter={setPriorityFilter}
      categoryFilter={categoryFilter}
      setCategoryFilter={setCategoryFilter}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      filteredHazards={filteredHazards}
      filteredPoints={filteredPoints}
      filteredReports={reports}
      teamAssignments={teamAssignments}
      setTeamAssignments={setTeamAssignments}
      teams={teams}
      setTeams={setTeams}
      onResolve={handleResolve}
      onUpdateStatus={handleUpdateHazardStatus}
      onVerifyRepair={handleVerifyRepair}
      onManualVerify={handleManualVerify}
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

  // Default routing for localhost and single-host deployment
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
