import React, { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import {
  MapPin, Image as ImageIcon, Flame, Hexagon,
  AlertTriangle, ShieldCheck, CheckCircle2, Truck, Wrench, Clock, Info, ExternalLink,
  Users, Camera, AlertCircle, RefreshCw, UploadCloud, ChevronRight, ChevronLeft, Search,
  Maximize2, X, Bell, Compass, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen
} from "lucide-react";
import HeatmapLayer from "../HeatmapLayer";
import HexGridLayer from "../HexGridLayer";
import ClusterLayer, { getHazardPinColor } from "../ClusterLayer";

const FALLBACK_HAZARD_IMG = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&q=80";

function relativeTime(str) {
  if (!str) return "Recently";
  const diff = Date.now() - new Date(str).getTime();
  if (isNaN(diff)) return "Recently";
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function FitBounds({ points }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    const validPoints = (points || []).filter(
      (p) => p && typeof p.lat === "number" && !isNaN(p.lat) && typeof p.lng === "number" && !isNaN(p.lng)
    );
    if (!fitted.current && validPoints.length > 0) {
      map.fitBounds(validPoints.map((p) => [p.lat, p.lng]), { padding: [48, 48], maxZoom: 15 });
      fitted.current = true;
    }
  }, [map, points]);
  return null;
}

export default function MapTab({
  hazards,
  dumpPoints,
  reports = [],
  isPublic = false,
  onUpdateStatus,
  onVerifyRepair,
  onManualVerify,
}) {
  const activeList = useMemo(() => {
    return hazards || dumpPoints || [];
  }, [hazards, dumpPoints]);

  const [selected, setSelected] = useState(null);
  const [map, setMap] = useState(null);
  const [viewMode, setViewMode] = useState("map"); // "map" | "satellite" | "hexgrid" | "heatmap"
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // ── Panel Expansion States (Toggleable) ─────────────────────────────
  const [leftOpen, setLeftOpen] = useState(!isPublic);
  const [rightOpen, setRightOpen] = useState(!isPublic);

  // Auto-select first active hazard on load if none selected
  useEffect(() => {
    if (!selected && activeList.length > 0) {
      setSelected(activeList[0]);
    }
  }, [activeList, selected]);

  // Keep selected hazard synced with updates
  useEffect(() => {
    if (selected) {
      const updated = activeList.find(p => (p.ticket_id && p.ticket_id === selected.ticket_id) || p.id === selected.id);
      if (updated && (updated.status !== selected.status || updated.updated_at !== selected.updated_at)) {
        setSelected(updated);
      }
    }
  }, [activeList, selected]);

  // Filter hazards by search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return activeList;
    const q = searchQuery.toLowerCase();
    return activeList.filter(h => {
      const tid = (h.ticket_id || h.id || "").toLowerCase();
      const cat = (h.category || h.hazard_type || "").toLowerCase();
      const loc = (h.location_name || h.address || "").toLowerCase();
      return tid.includes(q) || cat.includes(q) || loc.includes(q);
    });
  }, [activeList, searchQuery]);

  const handleSelectHazard = (hazard) => {
    setSelected(hazard);
    // Automatically open right details panel when a hazard is clicked (or lightbox in public view)
    if (!isPublic) {
      setRightOpen(true);
    } else {
      setLightboxOpen(true);
    }
    if (map && typeof hazard.lat === "number" && typeof hazard.lng === "number") {
      map.setView([hazard.lat, hazard.lng], 16, { animate: true });
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selected || !onUpdateStatus || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await onUpdateStatus(selected.id, newStatus);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="flex w-full h-full gap-2.5 overflow-hidden select-none">
      {/* ── COLUMN 1: LIVE HAZARD REPORTS (EXPANDED OR COLLAPSED STRIP) ── */}
      {!isPublic && (
        leftOpen ? (
          <section className="w-64 lg:w-[265px] shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
            {/* Header */}
          <div className="p-3.5 px-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <h2 className="text-xs font-black text-slate-900 tracking-tight uppercase">
                Live Hazard Reports
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer mr-1"
                title="Reset search filter"
              >
                <span>View All</span>
                <ChevronRight size={13} strokeWidth={2.5} />
              </button>
              {/* Collapse Toggle Button */}
              <button
                onClick={() => setLeftOpen(false)}
                title="Collapse reports panel"
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <PanelLeftClose size={15} />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hazard ID, street..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Hazard Cards Scroll List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredList.map((hazard) => {
              const isSelected = selected && (selected.id === hazard.id || selected.ticket_id === hazard.ticket_id);
              const ticketId = hazard.ticket_id || hazard.community_id || hazard.id;
              const category = hazard.category || hazard.hazard_type || hazard.name || "Road Hazard";
              const riskScore = hazard.risk_score ?? Math.min(99, (hazard.report_count || 1) * 15);
              const priority = hazard.priority_label || (riskScore >= 75 ? "Critical" : riskScore >= 50 ? "High" : riskScore >= 25 ? "Medium" : "Low");
              const photo = hazard.photo_url || (hazard.photos && hazard.photos[0]);
              const locationName = hazard.location_name || (hazard.lat ? `${hazard.lat.toFixed(4)}, ${hazard.lng.toFixed(4)}` : "City Road");

              let priorityBadgeClass = "bg-rose-50 text-rose-700 border-rose-200";
              if (priority === "High") priorityBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";
              else if (priority === "Medium") priorityBadgeClass = "bg-blue-50 text-blue-700 border-blue-200";
              else if (priority === "Low") priorityBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
              if (hazard.needs_human_review) priorityBadgeClass = "bg-purple-50 text-purple-700 border-purple-200";

              return (
                <div
                  key={hazard.id || ticketId}
                  onClick={() => handleSelectHazard(hazard)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-100 bg-blue-50/20 shadow-xs"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${priorityBadgeClass}`}>
                        • {priority}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {ticketId}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {relativeTime(hazard.created_at || hazard.last_reported)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden relative shrink-0 border border-slate-200/60">
                      {photo ? (
                        <img
                          src={photo}
                          alt={category}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_HAZARD_IMG;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon size={18} />
                        </div>
                      )}
                      <span className="absolute bottom-0.5 right-0.5 bg-black/60 rounded p-0.5 text-white">
                        <Camera size={8} />
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate mb-0.5">
                        {formatCategoryLabel(category)}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                        <MapPin size={9} className="shrink-0 text-slate-400" />
                        <span className="truncate">{locationName}</span>
                      </p>
                    </div>

                    <ChevronRight size={14} className={`shrink-0 ${isSelected ? "text-blue-500" : "text-slate-300"}`} />
                  </div>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="text-center p-8 text-slate-400 text-xs">
                No road hazards match the current filters.
              </div>
            )}
          </div>
        </section>
      ) : (
        /* Collapsed Left Handle Strip */
        <aside
          onClick={() => setLeftOpen(true)}
          title="Click to expand Live Hazard Reports"
          className="w-11 shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-sm flex flex-col items-center py-4 justify-between transition-all duration-300 ease-in-out cursor-pointer group"
        >
          <div className="flex flex-col items-center gap-2.5">
            <button
              onClick={(e) => { e.stopPropagation(); setLeftOpen(true); }}
              className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-500 group-hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <PanelLeftOpen size={16} />
            </button>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-1 py-0.5 rounded">
              {activeList.length}
            </span>
          </div>

          <div
            className="text-[11px] font-extrabold text-slate-400 group-hover:text-blue-600 tracking-wider transition-colors py-3 whitespace-nowrap"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            LIVE HAZARD REPORTS
          </div>

          <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center transition-colors">
            <ChevronRight size={13} strokeWidth={2.5} />
          </div>
        </aside>
      ))}

      {/* ── COLUMN 2: LIVE HAZARD MAP ──────────────────────────────────── */}
      <section className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col relative transition-all duration-300">
        {/* Map Header with View Mode Segmented Control and Quick Toggle Buttons */}
        <div className="p-3 px-4 border-b border-slate-100 flex items-center justify-between z-10 bg-white">
          <div className="flex items-center gap-2">
            {!isPublic && !leftOpen && (
              <button
                onClick={() => setLeftOpen(true)}
                title="Expand reports panel"
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer mr-1"
              >
                <PanelLeftOpen size={13} className="text-blue-600" />
                <span>Reports ({activeList.length})</span>
              </button>
            )}
            <MapPin size={16} className="text-blue-600" />
            <h2 className="text-xs font-black text-slate-900 tracking-tight">
              Live Hazard Map
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60">
              <button
                onClick={() => setViewMode("map")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "map" || viewMode === "pins"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setViewMode("satellite")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "satellite"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Satellite
              </button>
              <button
                onClick={() => setViewMode("hexgrid")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "hexgrid"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hex Grid
              </button>
            </div>

            {!isPublic && !rightOpen && (
              <button
                onClick={() => setRightOpen(true)}
                title="Expand details panel"
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <span>Details</span>
                <PanelRightOpen size={13} className="text-blue-600" />
              </button>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative bg-slate-100">
          <MapContainer
            center={[26.8467, 80.9462]}
            zoom={12}
            className="w-full h-full"
            zoomControl={false}
            ref={setMap}
          >
            {viewMode === "satellite" ? (
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                attribution='Tiles &copy; Esri'
              />
            ) : (
              <TileLayer
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
                attribution='&copy; OpenStreetMap'
              />
            )}

            <FitBounds points={activeList} />

            {(viewMode === "map" || viewMode === "pins" || viewMode === "satellite") && (
              <ClusterLayer dumpPoints={activeList} onPointClick={handleSelectHazard} />
            )}
            {viewMode === "heatmap" && <HeatmapLayer points={activeList} />}
            {viewMode === "hexgrid" && <HexGridLayer dumpPoints={activeList} />}
          </MapContainer>

          {/* Floating Risk Severity Legend (bottom-left) */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/90 p-3 text-xs space-y-1.5">
            <p className="font-extrabold text-slate-500 uppercase tracking-widest text-[9px] mb-1">
              Risk Severity
            </p>
            <LegendPin color="#ef4444" label="Critical (75–100)" />
            <LegendPin color="#f97316" label="High (50–74)" />
            <LegendPin color="#eab308" label="Medium (25–49)" />
            <LegendPin color="#22c55e" label="Low (1–24)" />
            <LegendPin color="#a855f7" label="Human Review Required" />
          </div>

          {/* Floating Zoom & Locate Controls (bottom-right) */}
          <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-1.5 shadow-lg rounded-xl overflow-hidden border border-slate-200/90 bg-white">
            <button
              onClick={() => map && map.zoomIn()}
              className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-50 text-base font-bold border-b border-slate-100 cursor-pointer"
            >
              +
            </button>
            <button
              onClick={() => map && map.zoomOut()}
              className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-50 text-base font-bold border-b border-slate-100 cursor-pointer"
            >
              −
            </button>
            <button
              onClick={() => {
                if (map && selected && selected.lat) {
                  map.setView([selected.lat, selected.lng], 16, { animate: true });
                }
              }}
              title="Center on selected"
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <Compass size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ── COLUMN 3: SELECTED HAZARD DETAILS (EXPANDED OR COLLAPSED STRIP) */}
      {!isPublic && (
        rightOpen ? (
          <section className="w-72 lg:w-[310px] shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-y-auto transition-all duration-300 ease-in-out relative">
            {/* Header Collapse Toggle Button */}
          <div className="absolute top-2.5 right-11 z-20">
            <button
              onClick={() => setRightOpen(false)}
              title="Collapse details panel"
              className="w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            >
              <PanelRightClose size={14} />
            </button>
          </div>

          {selected ? (
            <SelectedHazardDetails
              hazard={selected}
              onClose={() => setRightOpen(false)}
              onCenterMap={() => {
                if (map && selected.lat && selected.lng) {
                  map.setView([selected.lat, selected.lng], 16, { animate: true });
                }
              }}
              onOpenLightbox={() => setLightboxOpen(true)}
              onStatusChange={handleStatusChange}
              updatingStatus={updatingStatus}
              onVerifyRepair={onVerifyRepair}
              onManualVerify={onManualVerify}
            />
          ) : (
            <EmptyDetailsState onClose={() => setRightOpen(false)} />
          )}
        </section>
      ) : (
        /* Collapsed Right Handle Strip */
        <aside
          onClick={() => setRightOpen(true)}
          title="Click to expand Inspection Details"
          className="w-11 shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-sm flex flex-col items-center py-4 justify-between transition-all duration-300 ease-in-out cursor-pointer group"
        >
          <div className="flex flex-col items-center gap-2.5">
            <button
              onClick={(e) => { e.stopPropagation(); setRightOpen(true); }}
              className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-500 group-hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <PanelRightOpen size={16} />
            </button>
            {selected && (
              <span className={`w-2.5 h-2.5 rounded-full ${
                (selected.risk_score || 0) >= 75 ? "bg-rose-500" : (selected.risk_score || 0) >= 50 ? "bg-amber-500" : "bg-blue-500"
              }`}></span>
            )}
            {selected && (
              <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-1 py-0.5 rounded">
                {(selected.ticket_id || selected.id || "HAZ").slice(-4)}
              </span>
            )}
          </div>

          <div
            className="text-[11px] font-extrabold text-slate-400 group-hover:text-blue-600 tracking-wider transition-colors py-3 whitespace-nowrap"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            INSPECTION DETAILS
          </div>

          <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center transition-colors">
            <ChevronLeft size={13} strokeWidth={2.5} />
          </div>
        </aside>
      ))}

      {/* Image Lightbox Modal */}
      {lightboxOpen && selected && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2 cursor-default flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white rounded-full w-8 h-8 flex items-center justify-center text-base z-20 cursor-pointer shadow-md"
            >
              <X size={16} />
            </button>
            <div className="w-full flex-1 overflow-hidden flex items-center justify-center bg-black/40 rounded-xl">
              <img
                src={selected.repair_photo_url || selected.photo_url || (selected.photos && selected.photos[0]) || FALLBACK_HAZARD_IMG}
                alt="Hazard Evidence"
                className="w-full h-auto max-h-[60vh] object-contain rounded-xl"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_HAZARD_IMG;
                }}
              />
            </div>
            <div className="p-3.5 text-white flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-indigo-400">
                    {selected.ticket_id || selected.id}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {selected.status || "reported"}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mt-1">
                  {formatCategoryLabel(selected.category || selected.hazard_type || "Road Hazard")}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">
                  {selected.location_name || (selected.lat ? `${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}` : "City Road")}
                </span>
                <div className="text-[11px] font-semibold text-emerald-400 mt-0.5">
                  Verified Civic Report
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectedHazardDetails({
  hazard,
  onClose,
  onCenterMap,
  onOpenLightbox,
  onStatusChange,
  updatingStatus,
  onVerifyRepair,
  onManualVerify
}) {
  const ticketId = hazard.ticket_id || hazard.community_id || hazard.id;
  const category = hazard.category || hazard.hazard_type || hazard.name || "Road Hazard";
  const riskScore = hazard.risk_score ?? Math.min(99, (hazard.report_count || 1) * 15);
  const priority = hazard.priority_label || (riskScore >= 75 ? "Critical" : riskScore >= 50 ? "High" : riskScore >= 25 ? "Medium" : "Low");
  const photo = hazard.photo_url || (hazard.photos && hazard.photos[0]);
  const status = hazard.status || "reported";

  // Repair photo upload & verification state
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [photoView, setPhotoView] = useState("before");
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File exceeds 10 MB maximum limit.");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      setFilePreview(loadEvt.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAndVerify = async () => {
    if (!filePreview || !onVerifyRepair || verifying) return;
    setVerifying(true);
    try {
      const mimeType = selectedFile?.type || "image/jpeg";
      const res = await onVerifyRepair(hazard.id || ticketId, filePreview, mimeType);
      if (res?.ok) {
        setSelectedFile(null);
        setFilePreview(null);
        setPhotoView("after");
      }
    } finally {
      setVerifying(false);
    }
  };

  // SLA Status resolution
  const responseStatus = hazard.response_sla_status || (status !== "reported" ? "completed" : "on_track");
  const resolutionStatus = hazard.resolution_sla_status || (status === "resolved" ? "completed" : "on_track");

  return (
    <div className="flex flex-col pb-6">
      {/* ── 1. Hero Photo Header with Badges ──────────────────────────── */}
      <div className="relative w-full h-38 bg-slate-900 rounded-t-2xl overflow-hidden shrink-0">
        {photoView === "after" && hazard.repair_photo_url ? (
          <img
            src={hazard.repair_photo_url}
            alt="After repair"
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_HAZARD_IMG; }}
          />
        ) : photo ? (
          <img
            src={photo}
            alt={category}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_HAZARD_IMG; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <ImageIcon size={36} />
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className="bg-black/75 text-white font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg backdrop-blur-xs">
            {ticketId}
          </span>
          <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg text-white ${
            priority === "Critical" ? "bg-rose-600" : priority === "High" ? "bg-amber-600" : priority === "Medium" ? "bg-blue-600" : "bg-emerald-600"
          }`}>
            {priority}
          </span>
        </div>

        {/* Maximize Icon */}
        <button
          onClick={onOpenLightbox}
          className="absolute top-2.5 right-2.5 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-lg flex items-center justify-center text-white cursor-pointer z-10"
        >
          <Maximize2 size={13} />
        </button>

        {/* Before/After View Switcher (if repair photo exists) */}
        {hazard.repair_photo_url && (
          <div className="absolute bottom-2.5 left-2.5 flex rounded-lg bg-black/80 p-0.5 backdrop-blur-xs text-[10px] font-bold text-white z-10">
            <button
              onClick={() => setPhotoView("before")}
              className={`px-2 py-0.5 rounded cursor-pointer ${photoView === "before" ? "bg-amber-500 text-white" : "hover:text-slate-300"}`}
            >
              Before
            </button>
            <button
              onClick={() => setPhotoView("after")}
              className={`px-2 py-0.5 rounded cursor-pointer ${photoView === "after" ? "bg-emerald-500 text-white" : "hover:text-slate-300"}`}
            >
              After (Repair)
            </button>
          </div>
        )}
      </div>

      {/* ── 2. Content Details ────────────────────────────────────────── */}
      <div className="p-3.5 space-y-3">
        {/* Title and Distance / View on Map */}
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">
            {formatCategoryLabel(category)}
          </h3>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <MapPin size={13} className="text-slate-400" />
              <span>{hazard.location_name || (hazard.lat ? `${hazard.lat.toFixed(4)}, ${hazard.lng.toFixed(4)}` : "2.4 km")}</span>
            </span>
            <button
              onClick={onCenterMap}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
            >
              <span>View on Map</span>
              <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── 3. Incident Cluster Information Card ────────────────────── */}
        <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl p-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
            <Bell size={13} className="text-blue-600" />
            <span>Incident Cluster ({hazard.report_count || 1} Citizen Reports)</span>
          </div>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            {hazard.report_count > 1
              ? `Aggregated ${hazard.report_count} citizen submissions within 50m radius. Reinforces priority dispatch.`
              : "Single citizen incident within 50m radius. Repeat reports reinforce dispatch priority."}
          </p>
        </div>

        {/* ── 4. SLA Management (FY1.00) ───────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              SLA MANAGEMENT (FY1.00)
            </span>
            <span className="text-[10px] font-extrabold text-slate-500">
              Tier: <strong className="text-slate-800">{priority}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Response SLA */}
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Response SLA</p>
              <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                responseStatus === "completed"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-blue-100 text-blue-800"
              }`}>
                {responseStatus === "completed" ? "Completed" : "On Track"}
              </span>
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                {responseStatus === "completed" ? "Acknowledged" : "Pending Triage"}
              </p>
            </div>

            {/* Resolution SLA */}
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Resolution SLA</p>
              <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                resolutionStatus === "completed"
                  ? "bg-emerald-100 text-emerald-800"
                  : resolutionStatus === "approaching"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-800"
              }`}>
                {resolutionStatus === "completed" ? "Resolved" : "On Track"}
              </span>
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                {hazard.resolution_sla_deadline
                  ? relativeTime(hazard.resolution_sla_deadline)
                  : "Pending Triage"}
              </p>
            </div>
          </div>
        </div>

        {/* ── 5. Submit Repair Verification Photo Dropzone ──────────────── */}
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Camera size={12} />
            <span>SUBMIT REPAIR VERIFICATION PHOTO</span>
          </span>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

          {!filePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200/90 hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30 flex flex-col items-center justify-center gap-1.5"
            >
              <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Camera size={18} />
              </div>
              <p className="text-xs font-bold text-slate-700">Select After-Repair Photo</p>
              <p className="text-[10px] text-slate-400">JPG, PNG, Max size 10 MB</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col gap-2.5">
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 bg-black">
                <img src={filePreview} alt="Repair preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setSelectedFile(null); setFilePreview(null); }}
                  className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs cursor-pointer"
                >
                  ×
                </button>
              </div>

              <button
                onClick={handleUploadAndVerify}
                disabled={verifying}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Verifying with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={13} />
                    <span>Verify Repair with AI</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Verification Results Display if Already Verified */}
          {hazard.verification_status && (
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">AI Inspection Result</span>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.2 rounded-full ${
                  hazard.verification_status === "verified"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-purple-100 text-purple-800"
                }`}>
                  {hazard.verification_status} ({Math.round((hazard.verification_confidence || 0.9) * 100)}%)
                </span>
              </div>
              {hazard.verification_explanation && (
                <p className="text-[11px] text-slate-600 leading-relaxed italic">
                  "{hazard.verification_explanation}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── 6. Workflow Primary Action Buttons ───────────────────────── */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {status === "reported" && (
            <button
              onClick={() => onStatusChange("acknowledged")}
              disabled={updatingStatus}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={14} />
              <span>Acknowledge Hazard</span>
            </button>
          )}

          {status === "acknowledged" && (
            <button
              onClick={() => onStatusChange("dispatched")}
              disabled={updatingStatus}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Truck size={14} />
              <span>Dispatch Repair Crew</span>
            </button>
          )}

          {(status === "dispatched" || status === "in_repair") && (
            <button
              onClick={() => onStatusChange("resolved")}
              disabled={updatingStatus}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={14} />
              <span>Mark Hazard Resolved</span>
            </button>
          )}

          {status === "resolved" && (
            <button
              onClick={() => onStatusChange("acknowledged")}
              disabled={updatingStatus}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw size={13} />
              <span>Reopen Hazard Ticket</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyDetailsState({ onClose }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
        <MapPin size={24} />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-800">No Hazard Selected</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
          Select a hazard card from the live feed or click a pin on the map to inspect AI risk scores, view SLA timers, and verify repairs.
        </p>
      </div>
    </div>
  );
}

function LegendPin({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
      <span className="text-slate-600 text-[11px] font-medium">{label}</span>
    </div>
  );
}

function formatCategoryLabel(str) {
  if (!str) return "Road Hazard";
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
