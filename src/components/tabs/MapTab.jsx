import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { MapPin, Calendar, BarChart2, Image as ImageIcon, Flame, Hexagon } from "lucide-react";
import HeatmapLayer from "../HeatmapLayer";
import HexGridLayer from "../HexGridLayer";
import ClusterLayer from "../ClusterLayer";
import PublicRagChat from "../PublicRagChat";

function pinColor(point) {
  if (point?.status === "unmanaged") return "#a855f7";
  if (point?.report_count >= 7) return "#ef4444";
  if (point?.report_count >= 3) return "#f97316";
  return "#22c55e";
}

function formatDate(str) {
  return new Date(str).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function FitBounds({ points }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    const validPoints = (points || []).filter(
      (p) => p && typeof p.lat === "number" && !isNaN(p.lat) && typeof p.lng === "number" && !isNaN(p.lng)
    );
    if (!fitted.current && validPoints.length) {
      map.fitBounds(validPoints.map((p) => [p.lat, p.lng]), { padding: [48, 48] });
      fitted.current = true;
    }
  }, [map, points]);
  return null;
}

export default function MapTab({ dumpPoints, reports = [], isPublic = false }) {
  const [selected, setSelected] = useState(null);
  const [map, setMap] = useState(null);
  const [viewMode, setViewMode] = useState("pins"); // "pins" | "heatmap" | "hexgrid"

  return (
    <div className="flex w-full h-full overflow-hidden relative">
      {/* ── Left Panel ─────────────────────────── */}
      {!isPublic && (
        <aside className="w-[300px] shrink-0 bg-white border-r border-gray-100 flex flex-col shadow-inner z-[10]">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              LIVE FEED
            </h2>
            <span className="text-[10px] font-bold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{reports.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {[...reports].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((report) => (
              <div 
                key={report.id} 
                onClick={() => {
                  const point = dumpPoints.find(p => p.id === report.matched_point_id);
                  if (point && typeof point.lat === "number" && typeof point.lng === "number") {
                    setSelected(point);
                    setViewMode("pins");
                    if (map) {
                      map.setView([point.lat, point.lng], 16, { animate: true });
                    }
                  }
                }}
                className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-gray-900">{report.phone_number}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{new Date(report.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                {report.photo_url && (
                  <img src={report.photo_url} alt="Report" className="w-full h-24 object-cover rounded-md mb-2 bg-gray-50" />
                )}
                {report.matched_point_name ? (
                  <p className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 truncate">
                    📍 {report.matched_point_name}
                  </p>
                ) : (
                  <p className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-100 truncate">
                    📍 New Location Pending
                  </p>
                )}
              </div>
            ))}
            {reports.length === 0 && (
              <div className="text-center p-4 text-gray-400 text-xs">No reports found.</div>
            )}
          </div>
        </aside>
      )}

      {/* ── Map ─────────────────────────────────────────── */}
      <div className="flex-1 relative bg-[#e2e8f0]">
        
        <MapContainer
          center={[26.8467, 80.9462]}
          zoom={12}
          className="w-full h-full"
          zoomControl={false}
          ref={setMap}
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <FitBounds points={dumpPoints} />

          {viewMode === "pins" && <ClusterLayer dumpPoints={dumpPoints} onPointClick={setSelected} />}
          {viewMode === "heatmap" && <HeatmapLayer points={dumpPoints} />}
          {viewMode === "hexgrid" && <HexGridLayer dumpPoints={dumpPoints} />}
        </MapContainer>

        {/* Floating zoom controls (hidden on small mobile to save space, or just repositioned) */}
        <ZoomControls map={map} />

        {/* View Mode Toggle */}
        <div className="absolute bottom-6 right-4 md:top-4 md:bottom-auto md:left-auto z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100 p-1 flex flex-col md:flex-row items-center gap-1">
          <button
            onClick={() => { setViewMode("pins"); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              viewMode === "pins" ? "bg-green-50 text-green-700" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <MapPin size={14} /> Pins
          </button>
          <button
            onClick={() => { setViewMode("heatmap"); setSelected(null); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              viewMode === "heatmap" ? "bg-rose-50 text-rose-700" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Flame size={14} /> Heatmap
          </button>
          <button
            onClick={() => { setViewMode("hexgrid"); setSelected(null); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              viewMode === "hexgrid" ? "bg-violet-50 text-violet-700" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Hexagon size={14} /> Hex Grid
          </button>
        </div>

        {/* Legend */}
        {(viewMode === "pins" || viewMode === "hexgrid") && (
          <div className="absolute top-4 left-4 md:bottom-6 md:top-auto z-[1000] bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 px-3 py-2 md:px-4 md:py-3 text-[10px] md:text-xs space-y-1 md:space-y-1.5">
            <p className="font-semibold text-gray-400 mb-2 uppercase tracking-widest text-[9px]">Severity</p>
            <LegendPin color="#a855f7" label="Unmanaged" />
            <LegendPin color="#ef4444" label="High (7+)" />
            <LegendPin color="#f97316" label="Medium (3–6)" />
            <LegendPin color="#22c55e" label="Low (1–2)" />
          </div>
        )}
      </div>

      {/* ── Side Panel ─────────────────────────────────── */}
      <aside className={`absolute md:relative top-0 right-0 h-full w-full sm:w-[320px] md:w-[260px] z-[2000] shrink-0 bg-white md:border-l border-gray-100 overflow-y-auto flex-col shadow-2xl md:shadow-inner transition-transform duration-300 ${selected ? 'translate-x-0 flex' : 'translate-x-full md:translate-x-0 hidden md:flex'}`}>
        {selected ? (
          <DetailPanel point={selected} onClose={() => setSelected(null)} />
        ) : (
          <EmptyState />
        )}
      </aside>
    </div>
  );
}

function ZoomControls({ map }) {
  if (!map) return null;
  return (
    <div className="hidden md:flex absolute bottom-6 right-4 z-[1000] flex-col gap-1 shadow-lg rounded-lg overflow-hidden border border-gray-100">
      <button onClick={() => map.zoomIn()} className="w-9 h-9 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 text-xl font-light border-b border-gray-100">+</button>
      <button onClick={() => map.zoomOut()} className="w-9 h-9 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 text-xl font-light">−</button>
    </div>
  );
}

function LegendPin({ color, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex items-center justify-center w-4 h-4">
        <div className="absolute w-full h-full rounded-full opacity-30" style={{ backgroundColor: color }}></div>
        <div className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }}></div>
      </div>
      <span className="text-gray-600 text-xs">{label}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
        <MapPin size={24} className="text-gray-300" />
      </div>
      <p className="text-sm text-gray-400 leading-relaxed">Click a pin on the map to view dump point details.</p>
    </div>
  );
}

function DetailPanel({ point, onClose }) {
  const color = pinColor(point);
  const isUnmanaged = point.status === "unmanaged";
  return (
    <div className="flex flex-col">
      <div className="relative">
        {point.photos?.[0] ? (
          <img src={point.photos[0]} alt={point.name} className="w-full h-44 object-cover" />
        ) : (
          <div className="w-full h-44 bg-gray-50 flex items-center justify-center"><ImageIcon size={32} className="text-gray-200" /></div>
        )}
        <button onClick={onClose} className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 shadow text-lg leading-none">×</button>
        <span
          className={`absolute bottom-2 left-2 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
            isUnmanaged
              ? "bg-purple-100/90 text-purple-700 border border-purple-200"
              : "bg-white/90 text-gray-600"
          }`}
        >
          {isUnmanaged ? "⚠️ Unmanaged" : point.status}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div>
          {point.community_id && (
            <span className="text-[10px] font-black text-indigo-600 font-mono tracking-wide">{point.community_id}</span>
          )}
          <h2 className="text-sm font-semibold text-gray-900 leading-snug mt-0.5">{point.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{point.lat.toFixed(4)}, {point.lng.toFixed(4)}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "15" }}><BarChart2 size={18} style={{ color: color }} /></div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{point.report_count}</p>
            <p className="text-xs text-gray-400">Total reports</p>
          </div>
        </div>

        {isUnmanaged && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <p className="text-[10px] font-black text-purple-800 uppercase tracking-wide mb-1">⚠️ Unmanaged Site</p>
            <p className="text-xs text-purple-700 font-medium">{point.unmanaged_reason}</p>
            {point.resolved_at && (
              <p className="text-[10px] text-purple-500 mt-1">Cleanup attempted: {formatDate(point.resolved_at)}</p>
            )}
            <p className="text-[10px] text-purple-500 mt-0.5">Re-inspection required.</p>
          </div>
        )}

        <div className="border-t border-gray-100 pt-3 space-y-2.5">
          <DateRow label="First reported" date={point.first_reported} />
          <DateRow label="Last reported" date={point.last_reported} />
          {isUnmanaged && point.resolved_at && (
            <DateRow label="Resolved on" date={point.resolved_at} />
          )}
        </div>
      </div>
    </div>
  );
}

function DateRow({ label, date }) {
  return (
    <div className="flex items-start gap-2">
      <Calendar size={13} className="text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-xs font-medium text-gray-700">{formatDate(date)}</p>
      </div>
    </div>
  );
}
