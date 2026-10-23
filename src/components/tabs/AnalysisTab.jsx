import { useMemo } from "react";
import {
  AlertTriangle, ShieldCheck, Clock, Activity, AlertCircle, Wrench
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RCTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Area, AreaChart
} from "recharts";

function relativeTime(iso) {
  if (!iso) return "Recently";
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return "Recently";
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg border border-gray-100 rounded-lg px-3 py-2 text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <b>{p.value}</b>
        </p>
      ))}
    </div>
  );
}

function KPI({ label, value, sub, color, icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-xs flex items-center gap-3 px-4 py-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "18" }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xl font-black text-gray-900 leading-none">{value}</p>
        <p className="text-[11px] font-semibold text-gray-500 mt-1 truncate">{label}</p>
        {sub && <p className="text-[9px] text-gray-400 leading-tight mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AnalysisTab({ hazards, dumpPoints, reports = [] }) {
  const activeHazards = useMemo(() => {
    return hazards || dumpPoints || [];
  }, [hazards, dumpPoints]);

  const stats = useMemo(() => {
    const totalHazards = activeHazards.length;
    const critical = activeHazards.filter(h => (h.risk_score || 0) >= 75 || h.priority_label === "Critical").length;
    const high = activeHazards.filter(h => ((h.risk_score || 0) >= 50 && (h.risk_score || 0) < 75 && h.priority_label !== "Critical") || (h.priority_label === "High" && (h.risk_score || 0) < 75)).length;
    const medium = activeHazards.filter(h => ((h.risk_score || 0) >= 25 && (h.risk_score || 0) < 50 && h.priority_label !== "High" && h.priority_label !== "Critical") || (h.priority_label === "Medium" && (h.risk_score || 0) < 50)).length;
    const low = activeHazards.filter(h => ((h.risk_score || 0) < 25 && h.priority_label !== "Medium" && h.priority_label !== "High" && h.priority_label !== "Critical") || h.priority_label === "Low").length;
    const pendingReview = activeHazards.filter(h => h.needs_human_review || h.hazard_type === "unrelated_or_uncertain").length;
    const resolved = activeHazards.filter(h => h.status === "resolved").length;

    // Honest resolution time calculation: only for records having both timestamps
    const resolvedWithDates = activeHazards.filter(h => {
      if (!h.resolved_at || (!h.created_at && !h.first_reported)) return false;
      const start = new Date(h.created_at || h.first_reported).getTime();
      const end = new Date(h.resolved_at).getTime();
      return !isNaN(start) && !isNaN(end) && end >= start;
    });
    let avgResolutionStr = "N/A";
    if (resolvedWithDates.length > 0) {
      const totalHours = resolvedWithDates.reduce((sum, h) => {
        const start = new Date(h.created_at || h.first_reported).getTime();
        const end = new Date(h.resolved_at).getTime();
        const hrs = Math.max(0.1, (end - start) / (1000 * 60 * 60));
        return sum + hrs;
      }, 0);
      const avgHours = (totalHours / resolvedWithDates.length).toFixed(1);
      avgResolutionStr = `${avgHours}h`;
    }

    // Category Distribution
    const catMap = {
      pothole_or_damaged_road: { name: "Pothole / Road", count: 0, color: "#3b82f6" },
      open_manhole: { name: "Open Manhole", count: 0, color: "#ef4444" },
      waterlogging: { name: "Waterlogging", count: 0, color: "#06b6d4" },
      fallen_tree_or_obstruction: { name: "Fallen Tree", count: 0, color: "#10b981" },
      broken_streetlight: { name: "Broken Streetlight", count: 0, color: "#f59e0b" },
      stray_cattle: { name: "Stray Cattle", count: 0, color: "#8b5cf6" },
      unrelated_or_uncertain: { name: "Review Needed", count: 0, color: "#a855f7" },
    };

    activeHazards.forEach(h => {
      const t = h.hazard_type || "pothole_or_damaged_road";
      if (catMap[t]) {
        catMap[t].count += 1;
      } else {
        catMap.pothole_or_damaged_road.count += 1;
      }
    });

    const categoryData = Object.values(catMap)
      .filter(c => c.count > 0)
      .map(c => ({ name: c.name, value: c.count, color: c.color }));

    // Priority Distribution
    const priorityData = [
      { name: "Critical (75–100)", value: critical, color: "#ef4444" },
      { name: "High (50–74)", value: high, color: "#f97316" },
      { name: "Medium (25–49)", value: medium, color: "#eab308" },
      { name: "Low (1–24)", value: low, color: "#22c55e" },
    ].filter(p => p.value > 0);

    // Weekly trend
    const dayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    activeHazards.forEach(h => {
      const date = new Date(h.created_at || h.last_reported || Date.now());
      const day = date.toLocaleDateString("en-IN", { weekday: "short" });
      if (dayCounts[day] !== undefined) {
        dayCounts[day] += (h.report_count || 1);
      }
    });
    const weeklyData = Object.keys(dayCounts).map(day => ({ day, count: dayCounts[day] }));

    // Top 5 highest risk hazards
    const top5Risk = [...activeHazards]
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
      .slice(0, 5)
      .map(h => ({
        name: (h.ticket_id || h.id) + " " + (h.category ? h.category.split(" ")[0] : "Hazard"),
        score: h.risk_score || 50,
        color: (h.risk_score || 0) >= 75 ? "#ef4444" : (h.risk_score || 0) >= 50 ? "#f97316" : "#eab308",
      }));

    return {
      totalHazards,
      critical,
      high,
      pendingReview,
      resolved,
      avgResolutionStr,
      categoryData,
      priorityData,
      weeklyData,
      top5Risk,
    };
  }, [activeHazards]);

  return (
    <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto bg-[#f5f6f8]">
      {/* ── Left Content Grid ── */}
      <div className="flex-1 flex flex-col gap-4 p-4 min-w-0">

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <KPI
            label="Total Road Hazards"
            value={stats.totalHazards}
            color="#d97706"
            icon={<AlertTriangle size={18} />}
          />
          <KPI
            label="Critical / High Risk"
            value={stats.critical + stats.high}
            sub={`${stats.critical} Critical, ${stats.high} High`}
            color="#ef4444"
            icon={<AlertCircle size={18} />}
          />
          <KPI
            label="Pending AI Review"
            value={stats.pendingReview}
            sub="Low confidence / Ambiguous"
            color="#8b5cf6"
            icon={<Activity size={18} />}
          />
          <KPI
            label="Avg Resolution SLA"
            value={stats.avgResolutionStr}
            sub={`${stats.resolved} Resolved Hazards`}
            color="#10b981"
            icon={<Clock size={18} />}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Category Distribution Donut */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 flex flex-col h-[260px]">
            <p className="text-xs font-bold text-gray-800">Hazard Category Split</p>
            <p className="text-[10px] text-gray-400 mb-2">{stats.totalHazards} total reported</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius="45%"
                    outerRadius="68%"
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.categoryData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <RCTooltip content={<Tip />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Priority Split Donut */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 flex flex-col h-[260px]">
            <p className="text-xs font-bold text-gray-800">Priority Level Split</p>
            <p className="text-[10px] text-gray-400 mb-2">Deterministic risk tiers</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.priorityData}
                    cx="50%"
                    cy="45%"
                    innerRadius="45%"
                    outerRadius="68%"
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.priorityData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <RCTooltip content={<Tip />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Report Volume Area Chart */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-xs p-4 flex flex-col h-[260px]">
            <p className="text-xs font-bold text-gray-800">Weekly Citizen Intake</p>
            <p className="text-[10px] text-gray-400 mb-2">Reports logged per weekday</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.weeklyData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hazardGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} allowDecimals={false} />
                  <RCTooltip content={<Tip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Reports"
                    stroke="#d97706"
                    strokeWidth={2}
                    fill="url(#hazardGrad)"
                    dot={{ fill: "#d97706", r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 3: Top Risk Bar Chart & Recent Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Top 5 Highest Risk Hazards */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-xs p-4 flex flex-col h-[240px]">
            <p className="text-xs font-bold text-gray-800 mb-1">Top 5 Highest Risk Hazards</p>
            <p className="text-[10px] text-gray-400 mb-2">Ranked by explainable risk score (1–100)</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.top5Risk} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: "#9ca3af" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#4b5563" }} width={110} />
                  <RCTooltip content={<Tip />} />
                  <Bar dataKey="score" name="Risk Score" radius={[0, 4, 4, 0]}>
                    {stats.top5Risk.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3 Critical Recent Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeHazards.slice(0, 3).map((h) => {
              const photo = h.photo_url || (h.photos && h.photos[0]);
              return (
                <div
                  key={h.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden flex flex-col h-[200px] lg:h-[240px]"
                >
                  {photo ? (
                    <img src={photo} alt="" className="w-full h-24 lg:h-28 object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-24 lg:h-28 bg-gray-100 flex items-center justify-center text-gray-300">
                      <AlertTriangle size={24} />
                    </div>
                  )}
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-700 block">
                        {h.ticket_id || h.id}
                      </span>
                      <p className="text-[11px] font-bold text-gray-800 line-clamp-1 leading-tight mt-0.5">
                        {h.category || h.name || "Road Hazard"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                      <span className="text-[9px] font-medium text-gray-400 capitalize">
                        {h.status || "reported"}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          (h.risk_score || 0) >= 80
                            ? "bg-red-50 text-red-700"
                            : (h.risk_score || 0) >= 60
                            ? "bg-orange-50 text-orange-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        Risk {h.risk_score || 50}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right: Live Feed Stream ── */}
      <div className="w-full lg:w-[280px] shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col max-h-[340px] lg:max-h-none">
        <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex items-center justify-between bg-gray-50/50">
          <p className="text-xs font-bold text-gray-900 uppercase">Incoming Stream</p>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">Live</span>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {activeHazards.map((h) => (
            <div key={h.id} className="p-3 hover:bg-gray-50 transition-colors flex items-start gap-2.5">
              {(h.photo_url || (h.photos && h.photos[0])) ? (
                <img
                  src={h.photo_url || h.photos[0]}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-400">
                  <AlertTriangle size={16} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono font-bold text-amber-700 truncate">
                    {h.ticket_id || h.id}
                  </span>
                  <span className="text-[9px] text-gray-400">{relativeTime(h.created_at || h.last_reported)}</span>
                </div>
                <p className="text-[11px] font-semibold text-gray-800 truncate mt-0.5">
                  {h.category || h.name || "Road Hazard"}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1 rounded">
                    Score: {h.risk_score || 50}
                  </span>
                  <span className="text-[9px] text-gray-500 capitalize">
                    {h.status || "reported"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
