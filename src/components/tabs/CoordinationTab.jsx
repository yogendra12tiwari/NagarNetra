import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Polygon } from "react-leaflet";
import { latLngBounds } from "leaflet";
import { cellToBoundary, latLngToCell, polygonToCells } from "h3-js";
import { Plus, Users, Trash2, X, Settings2, CheckCircle2, Loader2, Search, ChevronLeft, AlertTriangle, Truck } from "lucide-react";
import { HAZARD_TEAMS } from "../../data/mockData";

// H3 Resolution (6 = district-level city zones)
const H3_RESOLUTION = 6;

const LUCKNOW_POLYGON = [
  [80.80, 26.75],
  [80.76, 26.87],
  [80.90, 26.93],
  [81.08, 26.98],
  [81.18, 26.89],
  [81.05, 26.88],
  [81.08, 26.75],
  [80.80, 26.75],
];

function workloadStyle(points, team, isSelected) {
  const maxRisk = points.reduce((max, pt) => Math.max(max, pt.risk_score || (pt.report_count || 1) * 15), 0);
  if (team?.id && team.id !== "unassigned") {
    return {
      fillColor: team.color,
      fillOpacity: isSelected ? 0.62 : 0.42,
      color: isSelected ? "#111827" : team.color,
      weight: isSelected ? 3 : 1.2,
    };
  }
  if (maxRisk >= 75 || points.length >= 4) {
    return { fillColor: "#ef4444", fillOpacity: isSelected ? 0.58 : 0.34, color: isSelected ? "#111827" : "#b91c1c", weight: isSelected ? 3 : 1.2 };
  }
  if (maxRisk >= 50 || points.length >= 2) {
    return { fillColor: "#f97316", fillOpacity: isSelected ? 0.55 : 0.30, color: isSelected ? "#111827" : "#c2410c", weight: isSelected ? 3 : 1.2 };
  }
  if (points.length > 0) {
    return { fillColor: "#22c55e", fillOpacity: isSelected ? 0.50 : 0.24, color: isSelected ? "#111827" : "#15803d", weight: isSelected ? 3 : 1.1 };
  }
  return { fillColor: "#e5e7eb", fillOpacity: isSelected ? 0.42 : 0.18, color: isSelected ? "#111827" : "#9ca3af", weight: isSelected ? 3 : 0.8 };
}

function priorityBadge(score) {
  if (score >= 75) return { label: "Critical", cls: "bg-red-100 text-red-700 border-red-200" };
  if (score >= 50) return { label: "High", cls: "bg-orange-100 text-orange-700 border-orange-200" };
  if (score >= 25) return { label: "Medium", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "Low", cls: "bg-green-100 text-green-700 border-green-200" };
}

export default function CoordinationTab({
  hazards,
  dumpPoints,
  reports = [],
  teamAssignments = {},
  setTeamAssignments = () => {},
  teams = HAZARD_TEAMS,
  setTeams = () => {},
  onResolve,
  resolvingIds = new Set(),
}) {
  const activeHazards = useMemo(() => {
    return hazards || dumpPoints || [];
  }, [hazards, dumpPoints]);

  const [selectedHex, setSelectedHex] = useState(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);

  // Build H3 hex grid
  const hexData = useMemo(() => {
    const data = {};
    try {
      const h3Indexes = polygonToCells(LUCKNOW_POLYGON, H3_RESOLUTION, true);
      for (const h3Index of h3Indexes) {
        data[h3Index] = { points: [], polygon: cellToBoundary(h3Index).map(c => [c[0], c[1]]) };
      }
      for (const pt of activeHazards) {
        if (pt.status === "resolved") continue;
        if (typeof pt.lat !== "number" || typeof pt.lng !== "number") continue;
        const h3Index = latLngToCell(pt.lat, pt.lng, H3_RESOLUTION);
        if (!data[h3Index]) {
          data[h3Index] = { points: [], polygon: cellToBoundary(h3Index).map(c => [c[0], c[1]]) };
        }
        data[h3Index].points.push(pt);
      }
    } catch (e) {
      console.warn("H3 computation error:", e);
    }
    return data;
  }, [activeHazards]);

  const bounds = useMemo(() => {
    const active = activeHazards.filter(p => p.status !== "resolved" && typeof p.lat === "number" && typeof p.lng === "number");
    if (active.length === 0) return [[26.8467, 80.9462]];
    const b = latLngBounds(active.map(p => [p.lat, p.lng]));
    return b.isValid() ? b : [[26.8467, 80.9462]];
  }, [activeHazards]);

  // Active open hazard points
  const openHazards = useMemo(() => {
    return activeHazards
      .filter(p => p.status !== "resolved")
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
  }, [activeHazards]);

  const hexFilteredHazards = useMemo(() => {
    if (!selectedHex) return openHazards;
    const hexPointIds = new Set((hexData[selectedHex]?.points || []).map(p => p.id));
    return openHazards.filter(p => hexPointIds.has(p.id));
  }, [openHazards, selectedHex, hexData]);

  const displayedHazards = useMemo(() => {
    if (!search.trim()) return hexFilteredHazards;
    const q = search.toLowerCase();
    return hexFilteredHazards.filter(p => {
      const matchTicket = p.ticket_id && p.ticket_id.toLowerCase().includes(q);
      const matchCat = p.category && p.category.toLowerCase().includes(q);
      const matchName = p.name && p.name.toLowerCase().includes(q);
      return matchTicket || matchCat || matchName;
    });
  }, [hexFilteredHazards, search]);

  const filteredHexList = useMemo(() => {
    if (!search.trim()) return Object.entries(hexData);
    const dispIds = new Set(displayedHazards.map(p => p.id));
    return Object.entries(hexData).filter(([_, { points }]) => {
      return points.some(p => dispIds.has(p.id));
    });
  }, [hexData, displayedHazards, search]);

  const selectedHexInfo = selectedHex ? hexData[selectedHex] : null;
  const currentTeamId = selectedHex ? teamAssignments[selectedHex] || "unassigned" : null;

  const handleResolveClick = (hazardId) => {
    if (confirmingId === hazardId) {
      setConfirmingId(null);
      if (onResolve) onResolve(hazardId);
    } else {
      setConfirmingId(hazardId);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-white">
      {/* ── MAP AREA ── */}
      <div className="flex-1 relative z-0">
        <MapContainer bounds={bounds} className="h-full w-full" zoomControl={false} attributionControl={false}>
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {filteredHexList.map(([h3Index, { polygon, points }]) => {
            const teamId = teamAssignments[h3Index] || "unassigned";
            const team = teams.find(t => t.id === teamId) || teams.find(t => t.id === "unassigned");
            const isSelected = selectedHex === h3Index;
            const style = workloadStyle(points, team, isSelected);
            return (
              <Polygon
                key={h3Index}
                positions={polygon}
                pathOptions={style}
                eventHandlers={{ click: () => setSelectedHex(isSelected ? null : h3Index) }}
              />
            );
          })}
        </MapContainer>

        {/* Selected Zone Assignment Pill */}
        {selectedHex && selectedHexInfo && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <Truck size={14} className="text-amber-600" /> Crew Assignment
              </span>
              <button onClick={() => setSelectedHex(null)} className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Dispatch Department Crew</label>
            <select
              className="w-full bg-white border border-gray-300 rounded-lg text-xs px-3 py-2 text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2"
              value={currentTeamId}
              onChange={(e) => setTeamAssignments(prev => ({ ...prev, [selectedHex]: e.target.value }))}
            >
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.department})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 font-medium">
              {selectedHexInfo.points.length} open road hazard{selectedHexInfo.points.length !== 1 ? "s" : ""} in this municipal zone
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-5 left-5 z-[1000] bg-white/95 backdrop-blur-xs rounded-xl shadow-lg border border-gray-100 px-4 py-3 text-xs">
          <p className="font-semibold text-gray-400 mb-2 uppercase tracking-widest text-[9px]">Zonal Workload Density</p>
          <LegendSwatch color="#ef4444" label="Critical Risk (P0 / 75+)" />
          <LegendSwatch color="#f97316" label="High Risk (50–74)" />
          <LegendSwatch color="#22c55e" label="Moderate / Clear" />
          <LegendSwatch color="#e5e7eb" label="No Active Reports" />
        </div>
      </div>

      {/* ── REPORT LIST SIDEBAR ── */}
      <div className="w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col z-10">

        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">Crew Dispatch Queue</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {selectedHex
                  ? `${displayedHazards.length} hazards in zone`
                  : `${openHazards.length} active hazards citywide`}
              </p>
            </div>
            {selectedHex && (
              <button
                onClick={() => setSelectedHex(null)}
                className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg cursor-pointer"
              >
                <ChevronLeft size={12} /> View All
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search Ticket ID or hazard…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>
        </div>

        {/* Hazard Dispatch Cards */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
          {displayedHazards.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8 opacity-60">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 size={20} className="text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700">No open hazards</p>
              <p className="text-xs text-gray-400 mt-1">All road hazards in this zone are currently clear.</p>
            </div>
          )}

          {displayedHazards.map(pt => {
            const score = pt.risk_score || (pt.report_count || 1) * 15;
            const badge = priorityBadge(score);
            const isResolving = resolvingIds.has(pt.id);
            const isConfirming = confirmingId === pt.id;

            return (
              <div
                key={pt.id}
                className={`bg-white border rounded-xl p-3 shadow-xs transition-all ${
                  isConfirming ? "border-amber-300 ring-2 ring-amber-100" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black text-amber-700 font-mono tracking-wide">
                      {pt.ticket_id || pt.community_id || pt.id}
                    </span>
                    <p className="text-xs font-bold text-gray-800 leading-snug truncate mt-0.5">
                      {pt.category || pt.name || "Road Hazard"}
                    </p>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
                    {badge.label} ({score})
                  </span>
                </div>

                {/* Sub info */}
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-3">
                  <span>Reports: <strong>{pt.report_count || 1}</strong></span>
                  <span className="capitalize">Status: <strong>{pt.status || "reported"}</strong></span>
                </div>

                {/* Confirm State */}
                {isConfirming && !isResolving && (
                  <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-[10px] font-bold text-amber-900 mb-1.5">
                      Mark this road hazard as fully resolved?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolveClick(pt.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Yes, Confirm
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action button */}
                {!isConfirming && (
                  <button
                    onClick={() => handleResolveClick(pt.id)}
                    disabled={isResolving}
                    className="w-full bg-white border border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 font-bold text-[11px] py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isResolving ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> Resolving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} /> Mark Hazard Resolved
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }) {
  return (
    <div className="flex items-center gap-2 mb-1.5 last:mb-0">
      <div className="w-3 h-3 rounded-sm border border-gray-300" style={{ backgroundColor: color }} />
      <span className="text-gray-600 text-[11px]">{label}</span>
    </div>
  );
}
