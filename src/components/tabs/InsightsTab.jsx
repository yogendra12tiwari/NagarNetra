import { useMemo, useState } from "react";
import {
  Sparkles, AlertTriangle, ShieldCheck, MapPin, Eye, CheckCircle2,
  HelpCircle, Layers, ArrowUpRight, Info
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import L from "leaflet";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Cell, RadialBarChart, RadialBar, Legend
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
  useMemo(() => {
    const valid = (points || []).filter(p => typeof p.lat === "number" && typeof p.lng === "number");
    if (valid.length > 0 && map) {
      map.fitBounds(valid.map(p => [p.lat, p.lng]), { padding: [36, 36], maxZoom: 14 });
    }
  }, [map, points]);
  return null;
}

function severityColor(score) {
  if (score >= 75) return "#ef4444";
  if (score >= 50) return "#f97316";
  if (score >= 25) return "#eab308";
  return "#22c55e";
}

function CompactStatCard({ label, value, color, icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-3 flex flex-col justify-center">
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-lg px-2.5 py-1.5 z-50 text-xs">
      <p className="font-bold text-gray-800 mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function InsightsTab({ hazards, dumpPoints, stats = {} }) {
  const activeHazards = useMemo(() => {
    return hazards || dumpPoints || [];
  }, [hazards, dumpPoints]);

  const [triageFilter, setTriageFilter] = useState("all"); // "all" | "review_only"

  // Process and sort hazards strictly by precomputed AI risk score
  const rankedHazards = useMemo(() => {
    return [...activeHazards]
      .map((h, i) => {
        const score = typeof h.risk_score === "number" ? h.risk_score : Math.min(99, (h.report_count || 1) * 15);
        const category = h.category || h.hazard_type || h.name || "Road Hazard";
        const reason = h.recommended_action || (h.risk_factors && h.risk_factors[0]) || `High-priority ${category} requiring rapid municipal intervention.`;
        return {
          ...h,
          aiScore: score,
          aiReason: reason,
          displayRank: i + 1,
        };
      })
      .sort((a, b) => b.aiScore - a.aiScore);
  }, [activeHazards]);

  // Human Review Needed Queue
  const reviewQueue = useMemo(() => {
    return rankedHazards.filter(h => h.needs_human_review || h.hazard_type === "unrelated_or_uncertain");
  }, [rankedHazards]);

  // Overall City Road Safety Health Score (0-100)
  const healthData = useMemo(() => {
    const total = rankedHazards.length;
    if (total === 0) return { score: 100, label: "All Roads Clear", color: "#22c55e", radialData: [{ name: "Road Safety", value: 100, fill: "#22c55e" }] };

    const totalRisk = rankedHazards.reduce((sum, h) => sum + h.aiScore, 0);
    const avgRisk = totalRisk / total;
    const safetyIndex = Math.max(0, Math.min(100, Math.round(100 - avgRisk)));

    const color = safetyIndex > 65 ? "#22c55e" : safetyIndex > 40 ? "#f97316" : "#ef4444";
    const label = safetyIndex > 65 ? "Road Network Stable" : safetyIndex > 40 ? "Elevated Road Risks" : "Critical Interventions Needed";

    return {
      score: safetyIndex,
      label,
      color,
      radialData: [{ name: "Road Safety", value: safetyIndex, fill: color }],
    };
  }, [rankedHazards]);

  // Top 10 recurring/risk hazards for charting
  const top10Chart = useMemo(() => {
    return rankedHazards.slice(0, 8).map(h => ({
      name: (h.ticket_id || h.id).slice(-4) + " " + (h.category ? h.category.split(" ")[0] : ""),
      score: h.aiScore,
    }));
  }, [rankedHazards]);

  const displayedQueue = triageFilter === "review_only" ? reviewQueue : rankedHazards;

  return (
    <div className="flex flex-1 overflow-hidden bg-[#f5f6f8] p-3 gap-3">
      {/* ── Left Column: Health Score & Metrics ── */}
      <div className="w-68 flex flex-col gap-3 shrink-0">
        
        {/* Radial Safety Index Score */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 flex flex-col items-center justify-center shrink-0 h-[220px]">
          <div className="self-start">
            <p className="text-xs font-black text-gray-800">City Road Safety Index</p>
            <p className="text-[10px] text-gray-400">Based on active hazard risk weights</p>
          </div>
          <div className="flex-1 w-full min-h-0 -mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="55%"
                innerRadius="65%"
                outerRadius="95%"
                data={healthData.radialData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar dataKey="value" background={{ fill: "#f3f4f6" }} cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-4xl font-black mt-[-30px]" style={{ color: healthData.color }}>
            {healthData.score}
            <span className="text-lg font-bold text-gray-300">/100</span>
          </p>
          <p className="text-[10px] font-bold mt-1 uppercase tracking-wider text-center" style={{ color: healthData.color }}>
            {healthData.label}
          </p>
        </div>

        {/* 2x2 Metric Cards */}
        <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
          <CompactStatCard
            label="Total Active"
            value={rankedHazards.length}
            color="#3b82f6"
            icon={<MapPin size={13} />}
          />
          <CompactStatCard
            label="Critical P0"
            value={rankedHazards.filter(h => h.aiScore >= 75 || h.priority_label === "Critical").length}
            color="#ef4444"
            icon={<AlertTriangle size={13} />}
          />
          <CompactStatCard
            label="Review Queue"
            value={reviewQueue.length}
            color="#8b5cf6"
            icon={<Eye size={13} />}
          />
          <CompactStatCard
            label="Verified Fixes"
            value={rankedHazards.filter(h => h.status === "resolved").length}
            color="#10b981"
            icon={<ShieldCheck size={13} />}
          />
        </div>

        {/* Transparent Formula Guide Pill */}
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-[11px] space-y-1">
          <p className="font-extrabold text-gray-700 text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Info size={12} className="text-amber-500" /> Explainable Scoring
          </p>
          <p className="text-gray-500 leading-snug text-[10px]">
            Scores are calculated deterministically by combining category base risk (10–40), visual severity (5–35), duplicate cluster count (up to +15), and model confidence.
          </p>
        </div>
      </div>

      {/* ── Middle Column: AI Priority Queue & Interactive Map ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        
        {/* Priority Triage Queue Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 flex flex-col shrink-0 h-[280px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={17} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-black text-gray-900 uppercase tracking-wide">
                  AI Risk Priority Queue
                </p>
                <p className="text-[10px] font-semibold text-gray-400">
                  Deterministic 1–100 Priority Engine
                </p>
              </div>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                onClick={() => setTriageFilter("all")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  triageFilter === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"
                }`}
              >
                All Hazards ({rankedHazards.length})
              </button>
              <button
                onClick={() => setTriageFilter("review_only")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  triageFilter === "review_only" ? "bg-white text-purple-700 shadow-xs" : "text-gray-500"
                }`}
              >
                Needs Review ({reviewQueue.length})
              </button>
            </div>
          </div>

          {/* Scrollable Queue List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {displayedQueue.map((hazard, idx) => {
              const color = severityColor(hazard.aiScore);
              return (
                <div
                  key={hazard.id}
                  className="p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-extrabold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                        #{idx + 1} {hazard.ticket_id || hazard.id}
                      </span>
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {hazard.category || hazard.name || "Road Hazard"}
                      </p>
                      {hazard.needs_human_review && (
                        <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded">
                          Review
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 line-clamp-1 italic">
                      "{hazard.aiReason}"
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className="text-xs font-black px-2 py-0.5 rounded block"
                      style={{ backgroundColor: color + "18", color }}
                    >
                      Score: {hazard.aiScore}
                    </span>
                    <span className="text-[9px] text-gray-400 capitalize block mt-0.5">
                      {hazard.status || "reported"}
                    </span>
                  </div>
                </div>
              );
            })}

            {displayedQueue.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">
                No hazards in selected triage queue.
              </p>
            )}
          </div>
        </div>

        {/* Priority Leaflet Map */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-2 flex flex-col flex-1 min-h-0 relative z-0">
          <MapContainer
            center={[26.8467, 80.9462]}
            zoom={12}
            className="w-full h-full rounded-lg z-0"
            zoomControl={false}
          >
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {rankedHazards.length > 0 && <FitBounds points={rankedHazards} />}
            {rankedHazards.map((hazard, i) => (
              <Marker
                key={hazard.id}
                position={[hazard.lat, hazard.lng]}
                icon={createAiMarker(severityColor(hazard.aiScore))}
              >
                <LeafletTooltip direction="top" offset={[0, -4]} className="nagarnetra-tooltip">
                  <div style={{ fontFamily: "inherit" }}>
                    <div style={{ fontWeight: 800, fontSize: 12, color: "#111827" }}>
                      #{i + 1} {hazard.ticket_id || hazard.id}
                    </div>
                    <div style={{ fontSize: 11, color: "#4b5563", marginTop: 1 }}>
                      {hazard.category || "Hazard"}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: severityColor(hazard.aiScore), marginTop: 2 }}>
                      Risk Score: {hazard.aiScore}/100
                    </div>
                  </div>
                </LeafletTooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* ── Right Column: Risk Rankings Chart ── */}
      <div className="w-72 flex flex-col gap-3 shrink-0 overflow-y-auto pr-1">
        
        {/* Top 8 Hazards by Risk Score Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 flex flex-col h-[280px]">
          <p className="text-xs font-black text-gray-800 mb-0.5">Top AI Priority Hotspots</p>
          <p className="text-[10px] text-gray-400 mb-2">Ranked by risk score (0-100)</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10Chart} layout="vertical" margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: "#9ca3af" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#6b7280" }} width={80} interval={0} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="score" name="Risk Score" radius={[0, 4, 4, 0]} barSize={12}>
                  {top10Chart.map((entry, idx) => (
                    <Cell key={idx} fill={severityColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Human Review Checklist Guidance Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 flex flex-col flex-1">
          <p className="text-xs font-black text-gray-800 mb-1 flex items-center gap-1.5">
            <HelpCircle size={14} className="text-purple-600" /> Triage Auditor Checklist
          </p>
          <p className="text-[10px] text-gray-500 mb-3 leading-snug">
            Follow standard operating procedures before updating critical tickets:
          </p>
          <div className="space-y-2 text-[11px] text-gray-700">
            <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
              <span className="font-bold text-amber-600">1.</span>
              <span>Confirm visual evidence depicts a genuine road surface hazard.</span>
            </div>
            <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
              <span className="font-bold text-amber-600">2.</span>
              <span>For open manholes (P0), dispatch Jal Sansthan within 2 hours.</span>
            </div>
            <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
              <span className="font-bold text-amber-600">3.</span>
              <span>Reclassify uncertain reports or request second photo via Telegram.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
