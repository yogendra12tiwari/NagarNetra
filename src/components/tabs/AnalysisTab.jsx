import { useMemo } from "react";
import { CheckCircle2, PlusCircle, XCircle, Clock, Activity } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RCTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Area, AreaChart,
} from "recharts";

const NOW = new Date("2026-07-06T14:30:00+05:30");

function relativeTime(iso) {
  const diff = NOW - new Date(iso);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function classLabel(c) {
  if (c === "matched") return { badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", label: "Matched", icon: <CheckCircle2 size={11} /> };
  if (c === "new_point") return { badge: "bg-violet-50 text-violet-700 ring-1 ring-violet-200", label: "New", icon: <PlusCircle size={11} /> };
  return { badge: "bg-red-50 text-red-600 ring-1 ring-red-200", label: "Rejected", icon: <XCircle size={11} /> };
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg border border-gray-100 rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color || p.fill }}>{p.name}: <b>{p.value}</b></p>)}
    </div>
  );
}

// Tiny KPI card — compact, no padding waste
function KPI({ label, value, sub, color, icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "18" }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black text-gray-900 leading-none">{value}</p>
        <p className="text-[10px] font-semibold text-gray-500 mt-0.5 truncate">{label}</p>
        {sub && <p className="text-[9px] text-gray-300 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

function ReportRow({ r }) {
  const m = classLabel(r.classification);
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
      <img src={r.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100" loading="lazy" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <p className="text-[11px] font-bold text-gray-800 truncate">{r.phone_number}</p>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${m.badge}`}>{m.icon}{m.label}</span>
        </div>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">{r.matched_point_name || r.reject_reason || "Pending"}</p>
        <p className="text-[9px] text-gray-300 flex items-center gap-1 mt-0.5"><Clock size={9} />{relativeTime(r.timestamp)}</p>
      </div>
    </div>
  );
}

export default function AnalysisTab({ dumpPoints, reports }) {
  const d = useMemo(() => {
    const matched = reports.filter(r => r.classification === "matched").length;
    const newPt = reports.filter(r => r.classification === "new_point").length;
    const rejected = reports.filter(r => r.classification === "rejected").length;
    const high = dumpPoints.filter(p => p.report_count >= 7).length;
    const med = dumpPoints.filter(p => p.report_count >= 3 && p.report_count < 7).length;
    const low = dumpPoints.filter(p => p.report_count < 3).length;
    const total = dumpPoints.reduce((s, p) => s + p.report_count, 0);

    const dayCounts = {};
    reports.forEach(r => {
      const day = new Date(r.timestamp).toLocaleDateString("en-IN", { weekday: "short" });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const activity = days.map(day => ({ day, count: dayCounts[day] || 0 }));

    const top5 = [...dumpPoints].sort((a, b) => b.report_count - a.report_count).slice(0, 5).map(p => ({
      name: p.name.split(" ").slice(0, 2).join(" "),
      count: p.report_count,
      color: p.report_count >= 7 ? "#ef4444" : p.report_count >= 3 ? "#f97316" : "#22c55e",
    }));

    const newest = [...dumpPoints].sort((a, b) => new Date(b.first_reported) - new Date(a.first_reported)).slice(0, 3);

    return {
      class: [
        { name: "Matched", value: matched, color: "#10b981" },
        { name: "New Point", value: newPt, color: "#8b5cf6" },
        { name: "Rejected", value: rejected, color: "#f43f5e" },
      ],
      sev: [
        { name: "High", value: high, color: "#ef4444" },
        { name: "Medium", value: med, color: "#f97316" },
        { name: "Low", value: low, color: "#22c55e" },
      ],
      activity, top5, newest, total,
      matchPct: Math.round((matched / reports.length) * 100),
    };
  }, [dumpPoints, reports]);

  return (
    // Responsive container — clean vertical scrolling on mobile & tablet, flex layout on desktop
    <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto bg-[#f5f6f8]">

      {/* ── Left content grid ── */}
      <div className="flex-1 flex flex-col gap-4 p-4 min-w-0">

        {/* Row 1: KPI pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <KPI label="Total Reports Logged" value={d.total} color="#6366f1" icon={<Activity size={16} />} />
          <KPI label="Match Rate" value={`${d.matchPct}%`} sub={`${d.class[0].value} of ${reports.length}`} color="#10b981" icon={<CheckCircle2 size={16} />} />
          <KPI label="New Sites Found" value={d.class[1].value} color="#8b5cf6" icon={<PlusCircle size={16} />} />
          <KPI label="Rejected Reports" value={d.class[2].value} color="#f43f5e" icon={<XCircle size={16} />} />
        </div>

        {/* Row 2: Pies + activity chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Classification donut */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col h-[240px]">
            <p className="text-xs font-bold text-gray-700">Report Classification</p>
            <p className="text-[10px] text-gray-400 mb-2">{reports.length} total incoming</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.class} cx="50%" cy="45%" innerRadius="45%" outerRadius="68%" paddingAngle={4} dataKey="value">
                    {d.class.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RCTooltip content={<Tip />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Severity donut */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col h-[240px]">
            <p className="text-xs font-bold text-gray-700">Site Severity Split</p>
            <p className="text-[10px] text-gray-400 mb-2">{dumpPoints.length} active sites</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.sev} cx="50%" cy="45%" innerRadius="45%" outerRadius="68%" paddingAngle={4} dataKey="value">
                    {d.sev.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RCTooltip content={<Tip />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly activity area chart */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col h-[240px]">
            <p className="text-xs font-bold text-gray-700">Weekly Report Activity</p>
            <p className="text-[10px] text-gray-400 mb-2">Reports per day this week</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.activity} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} allowDecimals={false} />
                  <RCTooltip content={<Tip />} />
                  <Area type="monotone" dataKey="count" name="Reports" stroke="#6366f1" strokeWidth={2} fill="url(#aGrad)" dot={{ fill: "#6366f1", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 3: Top sites bar + newest cards */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Top 5 horizontal bar */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col h-[220px]">
            <p className="text-xs font-bold text-gray-700 mb-2">Top 5 Highest Activity Sites</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.top5} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "#9ca3af" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#6b7280" }} width={85} />
                  <RCTooltip content={<Tip />} />
                  <Bar dataKey="count" name="Reports" radius={[0, 4, 4, 0]}>
                    {d.top5.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3 newest dump point cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {d.newest.map(pt => (
              <div key={pt.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[180px] lg:h-[220px]">
                <img src={pt.photos[0]} alt={pt.name} className="w-full h-24 lg:h-28 object-cover" loading="lazy" />
                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <p className="text-[11px] font-bold text-gray-800 line-clamp-2 leading-tight">{pt.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] text-gray-400">{pt.first_reported}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pt.report_count >= 7 ? "bg-red-50 text-red-600" : pt.report_count >= 3 ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600"}`}>
                      {pt.report_count} rep
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Live report feed ── */}
      <div className="w-full lg:w-[272px] shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col max-h-[320px] lg:max-h-none">
        <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-900">Live Feed</p>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">Live</span>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {[...reports].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(r => <ReportRow key={r.id} r={r} />)}
        </div>
      </div>
    </div>
  );
}
