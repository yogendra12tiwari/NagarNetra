import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Polygon } from "react-leaflet";
import { latLngBounds } from "leaflet";
import { cellToBoundary, latLngToCell, polygonToCells } from "h3-js";
import { Plus, Users, Trash2, X, Settings2, CheckCircle2, Loader2, Search, ChevronLeft, AlertTriangle } from "lucide-react";

// H3 Resolution (6 = large district-level zones)
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
  const totalReports = points.reduce((sum, pt) => sum + pt.report_count, 0);
  if (team?.id && team.id !== "unassigned") {
    return {
      fillColor: team.color,
      fillOpacity: isSelected ? 0.62 : 0.42,
      color: isSelected ? "#111827" : team.color,
      weight: isSelected ? 3 : 1.2,
    };
  }
  if (totalReports >= 45 || points.length >= 5) {
    return { fillColor: "#ef4444", fillOpacity: isSelected ? 0.58 : 0.34, color: isSelected ? "#111827" : "#b91c1c", weight: isSelected ? 3 : 1.2 };
  }
  if (totalReports >= 15 || points.length >= 2) {
    return { fillColor: "#f97316", fillOpacity: isSelected ? 0.55 : 0.30, color: isSelected ? "#111827" : "#c2410c", weight: isSelected ? 3 : 1.2 };
  }
  if (totalReports > 0) {
    return { fillColor: "#22c55e", fillOpacity: isSelected ? 0.50 : 0.24, color: isSelected ? "#111827" : "#15803d", weight: isSelected ? 3 : 1.1 };
  }
  return { fillColor: "#e5e7eb", fillOpacity: isSelected ? 0.42 : 0.18, color: isSelected ? "#111827" : "#9ca3af", weight: isSelected ? 3 : 0.8 };
}

function severityBadge(count) {
  if (count >= 20) return { label: "Critical", cls: "bg-red-100 text-red-700 border-red-200" };
  if (count >= 10) return { label: "High",     cls: "bg-orange-100 text-orange-700 border-orange-200" };
  if (count >= 5)  return { label: "Medium",   cls: "bg-yellow-100 text-yellow-700 border-yellow-200" };
  return               { label: "Low",      cls: "bg-green-100 text-green-700 border-green-200" };
}

export default function CoordinationTab({
  dumpPoints,
  reports = [],
  teamAssignments, setTeamAssignments,
  teams, setTeams,
  onResolve, resolvingIds, feedbackData,
}) {
  const [selectedHex, setSelectedHex] = useState(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [search, setSearch] = useState("");
  // confirmingId: point currently showing "confirm resolve?" inline
  const [confirmingId, setConfirmingId] = useState(null);

  const deleteTeam = (teamId) => {
    setTeams(prev => prev.filter(t => t.id !== teamId));
    setTeamAssignments(prev => {
      const next = { ...prev };
      for (const hex in next) {
        if (next[hex] === teamId) next[hex] = "unassigned";
      }
      return next;
    });
  };

  const updateTeamName = (teamId, newName) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, name: newName } : t));
  };

  // Build H3 hex grid
  const hexData = useMemo(() => {
    const data = {};
    const h3Indexes = polygonToCells(LUCKNOW_POLYGON, H3_RESOLUTION, true);
    for (const h3Index of h3Indexes) {
      data[h3Index] = { points: [], polygon: cellToBoundary(h3Index).map(c => [c[0], c[1]]) };
    }
    for (const pt of dumpPoints) {
      if (pt.status !== "active") continue;
      const h3Index = latLngToCell(pt.lat, pt.lng, H3_RESOLUTION);
      if (!data[h3Index]) {
        data[h3Index] = { points: [], polygon: cellToBoundary(h3Index).map(c => [c[0], c[1]]) };
      }
      data[h3Index].points.push(pt);
    }
    return data;
  }, [dumpPoints]);


  const bounds = useMemo(() => {
    const active = dumpPoints.filter(p => p.status === "active");
    if (active.length === 0) return [[26.8467, 80.9462]];
    const b = latLngBounds(active.map(p => [p.lat, p.lng]));
    return b.isValid() ? b : [[26.8467, 80.9462]];
  }, [dumpPoints]);

  // Report list: only active points, filtered by hex + search
  const activePoints = useMemo(() => {
    return dumpPoints
      .filter(p => p.status === "active")
      .sort((a, b) => {
         const timeA = new Date(a.last_reported).getTime();
         const timeB = new Date(b.last_reported).getTime();
         if (timeB !== timeA) return timeB - timeA;
         return (b.report_count || 0) - (a.report_count || 0);
      });
  }, [dumpPoints]);

  const hexFilteredPoints = useMemo(() => {
    if (!selectedHex) return activePoints;
    const hexPointIds = new Set((hexData[selectedHex]?.points || []).map(p => p.id));
    return activePoints.filter(p => hexPointIds.has(p.id));
  }, [activePoints, selectedHex, hexData]);

  const displayedPoints = useMemo(() => {
    if (!search.trim()) return hexFilteredPoints;
    const q = search.toLowerCase();
    
    // Create a map of pointId -> array of associated report IDs
    const reportIdsByPoint = {};
    reports.forEach(r => {
      if (r.matched_point_id) {
        if (!reportIdsByPoint[r.matched_point_id]) reportIdsByPoint[r.matched_point_id] = [];
        if (r.report_id) reportIdsByPoint[r.matched_point_id].push(r.report_id.toLowerCase());
      }
    });

    return activePoints.filter(p => {
      const matchName = p.name && p.name.toLowerCase().includes(q);
      const matchParentId = p.community_id && p.community_id.toLowerCase().includes(q);
      const childReportIds = reportIdsByPoint[p.id] || [];
      const matchChildId = childReportIds.some(id => id.includes(q));
      
      return matchName || matchParentId || matchChildId;
    });
  }, [hexFilteredPoints, search, reports]);

  const filteredHexList = useMemo(() => {
    if (!search.trim()) return Object.entries(hexData);
    const dispIds = new Set(displayedPoints.map(p => p.id));
    return Object.entries(hexData).filter(([h3Index, { points }]) => {
      return points.some(p => dispIds.has(p.id));
    });
  }, [hexData, displayedPoints, search]);

  const selectedHexInfo = selectedHex ? hexData[selectedHex] : null;
  const currentTeamId = selectedHex ? teamAssignments[selectedHex] || "unassigned" : null;

  const handleResolveClick = (pointId) => {
    if (confirmingId === pointId) {
      // Confirmed — trigger resolve
      setConfirmingId(null);
      onResolve(pointId);
    } else {
      setConfirmingId(pointId);
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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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

        {/* Team assignment tooltip over map when hex selected */}
        {selectedHex && selectedHexInfo && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-72">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-gray-700 uppercase tracking-wide">Zone Assignment</span>
              <button onClick={() => setSelectedHex(null)} className="text-gray-400 hover:text-gray-600 p-0.5 rounded"><X size={14} /></button>
            </div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Assign Team</label>
            <select
              className="w-full bg-white border border-gray-300 rounded-lg text-sm px-3 py-2 text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              value={currentTeamId}
              onChange={(e) => setTeamAssignments(prev => ({ ...prev, [selectedHex]: e.target.value }))}
            >
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <p className="text-[10px] text-gray-400 font-medium">
              {selectedHexInfo.points.length} active report{selectedHexInfo.points.length !== 1 ? "s" : ""} in this zone
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-5 left-5 z-[1000] bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-100 px-4 py-3 text-xs">
          <p className="font-semibold text-gray-400 mb-2 uppercase tracking-widest text-[9px]">Unassigned workload</p>
          <LegendSwatch color="#ef4444" label="Critical" />
          <LegendSwatch color="#f97316" label="Moderate" />
          <LegendSwatch color="#22c55e" label="Low" />
          <LegendSwatch color="#e5e7eb" label="No active reports" />
        </div>

        {/* Manage Teams button */}
        <div className="absolute bottom-5 right-5 z-[1000]">
          <button
            onClick={() => setIsManagerOpen(true)}
            className="bg-white border border-gray-300 hover:border-indigo-500 hover:text-indigo-600 text-gray-700 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg transition-all"
          >
            <Settings2 size={14} />Manage Teams
          </button>
        </div>
      </div>

      {/* ── REPORT LIST SIDEBAR ── */}
      <div className="w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col z-10">

        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100 bg-gray-50 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">Active Reports</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {selectedHex
                  ? `${displayedPoints.length} in selected zone`
                  : `${activePoints.length} total · click a zone to filter`}
              </p>
            </div>
            {selectedHex && (
              <button
                onClick={() => setSelectedHex(null)}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg"
              >
                <ChevronLeft size={12} />All
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or SWC-ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
          </div>
        </div>

        {/* Report Cards */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {displayedPoints.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8 opacity-50">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-500">No active reports</p>
              <p className="text-xs text-gray-400 mt-1">
                {selectedHex ? "No active reports in this zone." : "All reports resolved!"}
              </p>
            </div>
          )}

          {displayedPoints.map(pt => {
            const badge = severityBadge(pt.report_count);
            const isResolving = resolvingIds.has(pt.id);
            const isConfirming = confirmingId === pt.id;

            return (
              <div
                key={pt.id}
                className={`bg-white border rounded-xl p-3 shadow-sm transition-all ${
                  isConfirming ? "border-amber-300 shadow-amber-100 shadow-md" : "border-gray-100 hover:border-gray-200"
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-[10px] font-black text-indigo-600 font-mono tracking-wide">{pt.community_id}</span>
                      {reports.filter(r => r.matched_point_id === pt.id && r.report_id).slice(0, 3).map(r => (
                        <span key={r.id} className="text-[9px] font-semibold text-gray-400 font-mono">+{r.report_id}</span>
                      ))}
                      {reports.filter(r => r.matched_point_id === pt.id && r.report_id).length > 3 && (
                         <span className="text-[9px] font-semibold text-gray-400">+{reports.filter(r => r.matched_point_id === pt.id && r.report_id).length - 3} more</span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-800 leading-snug truncate">{pt.name}</p>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-3">
                  <span className="font-bold text-gray-700">{pt.report_count} reports</span>
                  <span>·</span>
                  <span>Last: {new Date(pt.last_reported).toLocaleDateString("en-IN", { day:"2-digit", month:"short" })}</span>
                </div>

                {/* Confirm state */}
                {isConfirming && !isResolving && (
                  <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-[10px] font-bold text-amber-800 mb-1.5">
                      ⚠️ Mark as resolved? Feedback will be sent to all reporters.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolveClick(pt.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black py-1.5 rounded-lg transition-colors"
                      >
                        Yes, Confirm
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-black py-1.5 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Resolve button / spinner */}
                {!isConfirming && (
                  <button
                    onClick={() => handleResolveClick(pt.id)}
                    disabled={isResolving}
                    className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isResolving
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200"
                    }`}
                  >
                    {isResolving ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Collecting feedback…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} />
                        Mark Resolved
                      </>
                    )}
                  </button>
                )}

              </div>
            );
          })}

          {/* Unmanaged notice at bottom */}
          {dumpPoints.filter(p => p.status === "unmanaged").length > 0 && (
            <div className="mt-1 p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={12} className="text-purple-600" />
                <span className="text-[10px] font-black text-purple-800 uppercase tracking-wide">Unmanaged Alerts</span>
              </div>
              <p className="text-[10px] text-purple-700 font-medium">
                {dumpPoints.filter(p => p.status === "unmanaged").length} site(s) received poor feedback and need re-inspection. Visible as purple pins on the map.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── MANAGE TEAMS MODAL ── */}
      {isManagerOpen && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Users className="text-indigo-600" size={20} />
                <h2 className="text-lg font-black text-gray-900">Manage Teams</h2>
              </div>
              <button onClick={() => setIsManagerOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-3">
              {teams.filter(t => t.id !== "unassigned").map(team => (
                <div key={team.id} className="flex items-center gap-3 bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: team.color + "20" }}>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }} />
                  </div>
                  <input
                    type="text"
                    value={team.name}
                    onChange={e => updateTeamName(team.id, e.target.value)}
                    className="flex-1 bg-transparent border-none text-sm font-bold text-gray-800 focus:outline-none px-1"
                  />
                  <button onClick={() => deleteTeam(team.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <form
                className="flex gap-2"
                onSubmit={e => {
                  e.preventDefault();
                  if (!newTeamName.trim()) return;
                  const colors = ["#8b5cf6", "#d946ef", "#f43f5e", "#0ea5e9", "#14b8a6", "#84cc16"];
                  const newTeam = { id: "team_" + Date.now(), name: newTeamName, color: colors[(teams.length - 1) % colors.length] };
                  const unassigned = teams.find(t => t.id === "unassigned");
                  const others = teams.filter(t => t.id !== "unassigned");
                  setTeams([...others, newTeam, unassigned]);
                  setNewTeamName("");
                }}
              >
                <input
                  type="text"
                  placeholder="New team name…"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 rounded-lg text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={!newTeamName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors font-bold text-sm flex items-center gap-2"
                >
                  <Plus size={16} />Add
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendSwatch({ color, label }) {
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <span className="w-2.5 h-2.5 rounded-sm border border-white shadow-sm" style={{ backgroundColor: color }} />
      <span className="text-gray-600">{label}</span>
    </div>
  );
}
