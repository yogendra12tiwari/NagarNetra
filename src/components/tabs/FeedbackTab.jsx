import { useRef, useState, useMemo } from "react";
import { MessageCircle, Plus, Send, Star, UserCircle2, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  RadialBarChart, RadialBar, PieChart, Pie, Cell, Tooltip
} from "recharts";

const templates = [
  {
    id: "post_cleanup",
    name: "Post-Cleanup Survey",
    trigger: "On Resolve",
    message: "Hi {{UserName}}! Your recent waste report at {{Location}} has been resolved. Please rate the cleanup quality (1-5):",
  },
  {
    id: "initial_confirmation",
    name: "Initial Confirmation",
    trigger: "On Report Creation",
    message: "Hi {{UserName}}, your report for {{Location}} has been received. Tracking ID: {{ReportID}}.",
  },
];

export default function FeedbackTab({ feedbacks = [], reports = [], points = [] }) {
  const [activeTemplate, setActiveTemplate] = useState(templates[0].id);
  const [messageText, setMessageText] = useState(templates[0].message);
  const [autoSend, setAutoSend] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const textareaRef = useRef(null);

  const selectTemplate = (template) => {
    setActiveTemplate(template.id);
    setMessageText(template.message);
    setIsSaved(false);
  };

  const insertToken = (token) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessageText((current) => `${current} ${token}`);
      return;
    }
    const hasEditorFocus = document.activeElement === textarea;
    const start = hasEditorFocus ? textarea.selectionStart : messageText.length;
    const end = hasEditorFocus ? textarea.selectionEnd : messageText.length;
    const spacer = !hasEditorFocus && messageText && !messageText.endsWith(" ") ? " " : "";
    setMessageText((current) => `${current.slice(0, start)}${spacer}${token}${current.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + spacer.length + token.length, start + spacer.length + token.length);
    });
  };

  const saveTemplate = () => {
    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 1800);
  };

  // ── Derive real stats from feedbacks ──────────────────────────────────────
  const allRatings = useMemo(() => feedbacks.map(f => f.rating), [feedbacks]);

  const avgRating = useMemo(() => {
    if (allRatings.length === 0) return "-";
    return (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1);
  }, [allRatings]);

  const responseRate = useMemo(() => {
    if (feedbacks.length === 0) return 0;
    
    // Total notified is the number of raw reports that were attached to points which have been resolved
    // To simplify: we can count reports matched to points that have status = "resolved" or "unmanaged"
    const resolvedPointIds = new Set(points.filter(p => p.status === "resolved" || p.status === "unmanaged").map(p => p.id));
    const totalNotified = reports.filter(r => resolvedPointIds.has(r.matched_point_id)).length;
    
    return totalNotified > 0 ? Math.round((feedbacks.length / totalNotified) * 100) : 0;
  }, [feedbacks, reports, points]);

  const ratingData = useMemo(() => {
    return [5, 4, 3, 2, 1].map(star => ({
      name: `${star} Star${star > 1 ? "s" : ""}`,
      count: allRatings.filter(r => r === star).length,
    }));
  }, [allRatings]);

  const responseRateData = [{ name: "Response Rate", value: responseRate, fill: "#25D366" }];

  // Satisfactory ratio logic (4-5 stars vs 1-3 stars)
  const satisfactoryRatioData = useMemo(() => {
    if (allRatings.length === 0) return [];
    const satisfied = allRatings.filter(r => r >= 4).length;
    const unsatisfied = allRatings.filter(r => r < 4).length;
    return [
      { name: "Satisfactory", value: satisfied, color: "#22c55e" },
      { name: "Unsatisfactory", value: unsatisfied, color: "#ef4444" }
    ];
  }, [allRatings]);

  // Live feedback feed from real resolved events
  const liveFeed = useMemo(() => {
    if (feedbacks.length === 0) return [];
    return [...feedbacks]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10)
      .map((entry, idx) => {
        const pt = points.find(p => p.id === entry.point_id);
        const ptName = pt ? pt.name : "Unknown Location";
        
        // Hide phone numbers for privacy
        const maskedPhone = entry.phone_number ? entry.phone_number.substring(0, 3) + "••••••" + entry.phone_number.slice(-3) : "Reporter";

        return {
          id: entry.id || idx,
          name: maskedPhone,
          rating: entry.rating,
          comment: entry.rating >= 4
            ? "Cleanup was effective. Happy with the response time."
            : entry.rating === 3
            ? "Partially cleaned — some waste still remains at the site."
            : "Not satisfied. The area looks the same as before.",
          time: new Date(entry.timestamp).toLocaleDateString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          location: ptName,
          reportId: entry.report_id,
        };
      });
  }, [feedbacks, points]);

  // Unmanaged count for alert
  const unmanagedCount = useMemo(() =>
    points.filter(p => p.status === "unmanaged").length,
  [points]);

  return (
    <div className="flex flex-1 overflow-hidden bg-[#f5f6f8] p-3 gap-3">

      {/* ── Main Col: Analytics & Template Editor (flex-1) ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        
        {/* Analytics Row */}
        <div className="flex gap-3 shrink-0 h-[160px]">
          {/* Top Stats */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col items-center justify-center flex-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Avg Rating</p>
              <div className="flex items-center gap-1">
                <span className="text-3xl font-black text-gray-900">{avgRating}</span>
                <Star size={16} fill="#FACC15" className="text-yellow-400" />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col items-center justify-center relative flex-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase absolute top-2 left-3 z-10">Response Rate</p>
              <div className="absolute inset-0 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={responseRateData} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" background={{ fill: "#f3f4f6" }} cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-lg font-black text-gray-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-2">{responseRate}%</p>
            </div>
          </div>

          {/* Satisfactory Ratio */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wider mb-2">Satisfactory Ratio</p>
            <div className="flex-1 min-h-0 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={satisfactoryRatioData}
                    cx="50%" cy="50%"
                    innerRadius={30} outerRadius={45}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {satisfactoryRatioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }} 
                    itemStyle={{ color: '#374151' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              {satisfactoryRatioData.length > 0 && (
                <p className="absolute text-[10px] font-black text-gray-800">
                  {Math.round((satisfactoryRatioData[0]?.value / (satisfactoryRatioData[0]?.value + satisfactoryRatioData[1]?.value)) * 100) || 0}%
                </p>
              )}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col flex-[1.5] min-w-0">
            <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wider mb-2">Rating Distribution</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#6b7280" }} width={45} interval={0} axisLine={false} tickLine={false} />
                  <Bar dataKey="count" fill="#FACC15" radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 className="text-base font-black text-gray-900">Automated Messaging</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Manage WhatsApp survey triggers and templates.</p>
            </div>
            <div className="flex items-center gap-4">
              {unmanagedCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-full border border-red-100">
                  <AlertTriangle size={12} />
                  <span className="text-[10px] font-bold">{unmanagedCount} Unmanaged Alerts</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                <MessageCircle size={12} />
                <span className="text-[10px] font-bold">API Connected</span>
              </div>
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <span className="text-xs font-bold text-gray-600">Auto-send</span>
                <button
                  onClick={() => setAutoSend(!autoSend)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${autoSend ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${autoSend ? "left-6" : "left-1"}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex p-4 gap-6 min-h-0">
            {/* Editor */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mr-2">Trigger:</span>
                {templates.map((template) => {
                  const isActive = activeTemplate === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => selectTemplate(template)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        isActive ? "bg-[#25D366] text-white shadow-sm shadow-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {isActive && <CheckCircle2 size={12} />}
                      {template.name}
                    </button>
                  );
                })}
              </div>

              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Message Content</label>
              <textarea
                ref={textareaRef}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full flex-1 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent resize-none leading-relaxed"
              />
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => insertToken("{{UserName}}")} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-md hover:bg-gray-200">{"{{"}UserName{"}}"}</button>
                <button type="button" onClick={() => insertToken("{{Location}}")} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-md hover:bg-gray-200">{"{{"}Location{"}}"}</button>
                <button type="button" onClick={() => insertToken("{{ReportID}}")} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-md hover:bg-gray-200">{"{{"}ReportID{"}}"}</button>
              </div>
              <div className="mt-4 flex items-center justify-end gap-3">
                {isSaved && <span className="text-xs font-bold text-green-600">Saved</span>}
                <button type="button" onClick={saveTemplate} className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm py-2 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-green-200">
                  <Send size={14} />Save Template
                </button>
              </div>
            </div>

            {/* WhatsApp Preview */}
            <div className="w-[280px] shrink-0 bg-[#EFEAE2] rounded-xl border border-gray-200 overflow-hidden flex flex-col relative shadow-inner">
              <div className="bg-[#075E54] px-3 py-2.5 flex items-center gap-2 z-10 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=NagarNetra&backgroundColor=075E54" alt="Bot" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">NagarNetra</p>
                  <p className="text-[10px] text-green-100 font-medium">Official Business Account</p>
                </div>
              </div>
              <div className="flex-1 p-3 overflow-y-auto">
                <div className="bg-white p-2.5 rounded-lg rounded-tl-none shadow-sm max-w-[90%] relative mt-2 inline-block">
                  <p className="text-[13px] text-gray-800 leading-snug whitespace-pre-wrap">
                    {messageText.replace("{{UserName}}", "Rahul").replace("{{Location}}", "Connaught Place").replace("{{ReportID}}", "SWC-0042")}
                  </p>
                  <span className="text-[9px] text-gray-400 float-right mt-1 ml-3">10:42 AM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Col: Live Feedback (w-[320px]) ── */}
      <div className="w-[320px] flex flex-col shrink-0">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-black text-gray-800 uppercase tracking-wider">Live Feedback</p>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {liveFeed.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-gray-400 font-medium">No feedback available yet.</p>
              </div>
            ) : (
              liveFeed.map((fb) => (
                <div key={fb.id} className="flex flex-col gap-1.5 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCircle2 size={16} className="text-gray-400" />
                      <p className="text-sm font-bold text-gray-800">{fb.name}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                      <span className="text-xs font-black text-yellow-700">{fb.rating}</span>
                      <Star size={12} fill="#FACC15" className="text-yellow-500" />
                    </div>
                  </div>
                  {fb.location && (
                    <p className="text-[10px] font-mono text-indigo-500 bg-indigo-50 inline-block px-1.5 py-0.5 rounded self-start">{fb.reportId} · {fb.location}</p>
                  )}
                  <p className="text-xs text-gray-600 leading-relaxed italic mt-0.5">"{fb.comment}"</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">{fb.time}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
