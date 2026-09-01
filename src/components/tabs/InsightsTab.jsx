import { useMemo, useState, useEffect } from "react";
import { analyzeDumpPoints } from "../../services/gemini";
import { MapPin, FileText, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { MapContainer, TileLayer, Marker, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import L from "leaflet";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Cell, RadialBarChart, RadialBar, Legend,
} from "recharts";

function createAiMarker(color) {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div class="nagarnetra-marker" style="--marker-color: ${color}; pointer-events: none;">
             <div class="nagarnetra-marker-pulse" style="pointer-events: none;"></div>
             <div class="nagarnetra-marker-core" style="transform: scale(1.1); pointer-events: none;"></div>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) {
      map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [48, 48] });
    }
  }, [map, points]);
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function severityColor(count) {
  if (count >= 7) return "#ef4444";
  if (count >= 3) return "#f97316";
  return "#22c55e";
}

function buildLocalPriorities(dumpPoints) {
  return [...dumpPoints]
    .map((point) => {
      const daysActive = Math.max(
        1,
        Math.round((new Date(point.last_reported) - new Date(point.first_reported)) / (1000 * 60 * 60 * 24))
      );
      const recencyBoost = point.last_reported === "2026-07-06" ? 10 : 0;
      const aiScore = Math.min(99, Math.round(point.report_count * 3 + Math.min(daysActive / 14, 24) + recencyBoost));
      return {
        ...point,
        aiScore,
        aiReason: `Ranked highly because it has ${point.report_count} reports across ${daysActive} active days, making it a repeat cleanup hotspot.`,
      };
    })
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, 10);
}

// ─── Compact Stat Card ────────────────────────────────────────────────────────
function CompactStatCard({ label, value, color, icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: color + "18" }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <p className="text-[10px] font-semibold text-gray-500 leading-tight">{label}</p>
      </div>
      <p className="text-xl font-black text-gray-900 leading-none">{value}</p>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-lg px-2 py-1.5 z-50">
      <p className="text-[10px] font-bold text-gray-700 mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[10px]" style={{ color: p.color || p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function InsightsTab({ dumpPoints, stats }) {
  const [aiRanked, setAiRanked] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(true);
  const [priorityMode, setPriorityMode] = useState("Gemini priority model");

  useEffect(() => {
    let isMounted = true;
    setIsAiLoading(true);
    setPriorityMode("Gemini priority model");

    const fallbackTimer = setTimeout(() => {
      if (!isMounted) return;
      setAiRanked(buildLocalPriorities(dumpPoints));
      setPriorityMode("Local priority model");
      setIsAiLoading(false);
    }, 2200);

    analyzeDumpPoints(dumpPoints).then(ranked => {
      if (!isMounted) return;
      clearTimeout(fallbackTimer);
      if (ranked && ranked.length > 0) {
        const merged = ranked.map(r => {
          const dp = dumpPoints.find(p => p.id === r.id);
          return { ...dp, ...r };
        }).filter(x => x.name); // ensure we found it
        setAiRanked(merged);
        setPriorityMode("Gemini priority model");
      } else {
        setAiRanked(buildLocalPriorities(dumpPoints));
        setPriorityMode("Local priority model");
      }
      setIsAiLoading(false);
    }).catch(() => {
      if (!isMounted) return;
      clearTimeout(fallbackTimer);
      setAiRanked(buildLocalPriorities(dumpPoints));
      setPriorityMode("Local priority model");
      setIsAiLoading(false);
    });
    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [dumpPoints]);

  const data = useMemo(() => {
    const sorted = [...dumpPoints].sort((a, b) => b.report_count - a.report_count);
    const top10 = sorted.slice(0, 10).map(p => ({
        name: p.name.split(" ").slice(0, 2).join(" "),
        report_count: p.report_count
    }));

    const daysActive = dumpPoints.map(p => ({
      name: p.name.split(" ").slice(0, 2).join(" "),
      days: Math.round((new Date(p.last_reported) - new Date(p.first_reported)) / (1000 * 60 * 60 * 24)),
    })).sort((a, b) => b.days - a.days).slice(0, 8);

    const high = dumpPoints.filter(p => p.report_count >= 7).length;
    const med = dumpPoints.filter(p => p.report_count >= 3 && p.report_count < 7).length;
    const low = dumpPoints.filter(p => p.report_count < 3).length;
    const totalReports = dumpPoints.reduce((s, p) => s + p.report_count, 0);

    const maxPossible = dumpPoints.length * 15;
    const healthScore = Math.max(0, Math.round(100 - (totalReports / (maxPossible || 1)) * 100));

    const radialData = [
      { name: "Health Score", value: healthScore, fill: healthScore > 60 ? "#22c55e" : healthScore > 35 ? "#f97316" : "#ef4444" },
    ];

    return { top10, daysActive, high, med, low, totalReports, healthScore, radialData };
  }, [dumpPoints]);

  return (
    // Fixed viewport, NO scroll
    <div className="flex flex-1 overflow-hidden bg-[#f5f6f8] p-3 gap-3">

      {/* ── Left Col: Health Score & Stats (w-64) ── */}
      <div className="w-64 flex flex-col gap-3 shrink-0">
        
        {/* Radial Health Score */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center justify-center shrink-0 h-[220px]">
          <p className="text-xs font-bold text-gray-800 self-start">City Cleanliness Score</p>
          <div className="flex-1 w-full min-h-0 -mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="55%" innerRadius="65%" outerRadius="95%" data={data.radialData} startAngle={180} endAngle={0}>
                <RadialBar dataKey="value" background={{ fill: "#f3f4f6" }} cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-4xl font-black mt-[-30px]" style={{ color: data.healthScore > 60 ? "#22c55e" : data.healthScore > 35 ? "#f97316" : "#ef4444" }}>
            {data.healthScore}<span className="text-lg font-bold text-gray-300">/100</span>
          </p>
          <p className="text-[10px] font-semibold text-gray-400 mt-1 uppercase tracking-wider">
            {data.healthScore > 60 ? "Relatively Clean" : data.healthScore > 35 ? "Needs Attention" : "High Risk"}
          </p>
        </div>

        {/* 2x2 Stat Cards Grid */}
        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
          <CompactStatCard label="Active Sites" value={dumpPoints.length} color="#6366f1" icon={<MapPin size={12} />} />
          <CompactStatCard label="Critical Zones" value={data.high} color="#ef4444" icon={<AlertTriangle size={12} />} />
          <CompactStatCard label="Total Reports" value={data.totalReports} color="#f97316" icon={<FileText size={12} />} />
          <CompactStatCard label="Weekly Rep." value={stats.reportsThisWeek} color="#10b981" icon={<TrendingUp size={12} />} />
        </div>
      </div>

      {/* ── Middle Col: Main Focus (flex-1) ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        
        {/* AI Priority Zones (Moved to Center) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col shrink-0 h-[260px]">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-indigo-500 shrink-0" />
            <div>
              <p className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 uppercase tracking-wide">AI Priority Zones</p>
              {!isAiLoading && (
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">{priorityMode}</p>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {isAiLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 mt-10 px-4">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full blur animate-pulse opacity-20"></div>
                  <Sparkles size={32} className="text-indigo-500 animate-pulse relative z-10" />
                </div>
                <div className="w-full max-w-[200px] flex flex-col gap-2 items-center">
                  <p className="text-xs font-semibold text-indigo-600/80 uppercase tracking-widest animate-pulse">Running AI Model...</p>
                  {/* Indeterminate Progress Bar */}
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full animate-[progress_1.5s_ease-in-out_infinite]" style={{ animationName: "indeterminate-progress" }}></div>
                  </div>
                </div>
              </div>
            ) : aiRanked.length > 0 ? (
              aiRanked.map((pt, i) => (
                <div key={pt.id} className="flex flex-col gap-1.5 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-800 truncate">{i + 1}. {pt.name}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0 bg-red-50 text-red-600">
                      Score: {pt.aiScore}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed italic">
                    "{pt.aiReason}"
                  </p>
                </div>
              ))
            ) : (
               <p className="text-xs text-gray-500 text-center mt-4">No critical zones identified or API error.</p>
            )}
          </div>
        </div>

        {/* AI Map */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2 flex flex-col flex-1 min-h-0 relative z-0">
          <MapContainer
            center={[26.8467, 80.9462]}
            zoom={12}
            className="w-full h-full rounded-lg z-0"
            zoomControl={false}
          >
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {aiRanked.length > 0 && <FitBounds points={aiRanked} />}
            {aiRanked.map((pt, i) => (
              <Marker
                key={pt.id}
                position={[pt.lat, pt.lng]}
                icon={createAiMarker(severityColor(pt.report_count))}
              >
                <LeafletTooltip direction="top" offset={[0, -4]} className="nagarnetra-tooltip">
                  <div style={{ fontFamily: "inherit" }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: "#1a202c" }}>#{i + 1}. {pt.name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{pt.aiScore} AI Score</div>
                  </div>
                </LeafletTooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* ── Right Col: Rankings & Distributions (w-72) ── */}
      <div className="w-72 flex flex-col gap-3 shrink-0 overflow-y-auto pr-1 pb-1">
        
        {/* Severity Distribution (Moved to Right) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col shrink-0 h-[220px]">
          <p className="text-xs font-bold text-gray-800 mb-1">Site Severity Distribution</p>
          <div className="flex-1 min-h-0 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: "Count", High: data.high, Medium: data.med, Low: data.low }]} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                <Bar dataKey="High" name="High (7+)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
                <Bar dataKey="Medium" name="Medium (3–6)" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={60} />
                <Bar dataKey="Low" name="Low (1–2)" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={60} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 Sites */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col shrink-0 h-[260px]">
          <p className="text-xs font-bold text-gray-800 mb-1">Top 10 Recurring Sites</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top10} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#6b7280" }} width={80} interval={0} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="report_count" name="Reports" radius={[0, 4, 4, 0]} barSize={12}>
                  {data.top10.map((entry, i) => (
                    <Cell key={i} fill={severityColor(entry.report_count)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Days Active */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col shrink-0 h-[220px]">
          <p className="text-xs font-bold text-gray-800 mb-1">Days Active (Top 8 Sites)</p>
          <div className="flex-1 min-h-0 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.daysActive} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#9ca3af" }} interval={0} />
                <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="days" name="Days Active" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
