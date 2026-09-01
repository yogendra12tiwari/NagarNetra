import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { latLngToCell, cellToBoundary, polygonToCells } from "h3-js";

// ── Lucknow bounding polygon ([lng, lat] pairs for h3-js) ─────────────────────
const LUCKNOW_POLYGON = [
  [80.80, 26.75], // SW
  [80.76, 26.87], // Kakori bulge
  [80.90, 26.93], // Top-Mid (Cuts off NW)
  [81.08, 26.98], // NE (Added bulge for green area)
  [81.18, 26.89], // East bulge
  [81.05, 26.88], // Cut sharply back in
  [81.08, 26.75], // SE
  [80.80, 26.75], // Close
];

// Resolution 6 → ~36 km² per hex — large district-level zones across the city
const H3_RESOLUTION = 6;

// ── Area health colour based on total dump activity in the zone ───────────────
// Every hex gets a solid colour — no transparent "ghost" areas.
// Green = clean / low activity. Orange = moderate. Red = critical.
function hexStyle(totalReports, dumpCount) {
  if (totalReports >= 60 || dumpCount >= 8) {
    return { color: "#b91c1c", fillColor: "#ef4444", fillOpacity: 0.25, weight: 1.2, opacity: 0.6 };
  }
  if (totalReports >= 25 || dumpCount >= 3) {
    return { color: "#c2410c", fillColor: "#f97316", fillOpacity: 0.20, weight: 1.2, opacity: 0.6 };
  }
  if (totalReports >= 1) {
    return { color: "#15803d", fillColor: "#22c55e", fillOpacity: 0.15, weight: 1.2, opacity: 0.6 };
  }
  return { color: "#86efac", fillColor: "#dcfce7", fillOpacity: 0.08, weight: 0.8, opacity: 0.4 };
}


export default function HexGridLayer({ dumpPoints }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    // 1. Get all H3 cells covering Lucknow at resolution 7
    const h3Indexes = polygonToCells(LUCKNOW_POLYGON, H3_RESOLUTION, true);

    // 2. Bucket dump points into cells, summing report_count
    const cellData = {};
    dumpPoints.forEach((pt) => {
      const cell = latLngToCell(pt.lat, pt.lng, H3_RESOLUTION);
      if (!cellData[cell]) cellData[cell] = { totalReports: 0, points: [] };
      cellData[cell].totalReports += pt.report_count;
      cellData[cell].points.push(pt);
    });

    // 3. Draw every hex (both active and clean)
    const polygons = [];

    h3Indexes.forEach((h3Index) => {
      const data = cellData[h3Index];
      const totalReports = data?.totalReports ?? 0;
      const dumpCount = data?.points?.length ?? 0;
      const style = hexStyle(totalReports, dumpCount);

      // cellToBoundary returns [lat, lng] pairs — Leaflet wants [lat, lng]
      const latLngs = cellToBoundary(h3Index).map(([lat, lng]) => [lat, lng]);

      const poly = L.polygon(latLngs, style);

      // Tooltip on all hexes
      if (totalReports > 0) {
        const pointLines = data.points
          .sort((a, b) => b.report_count - a.report_count)
          .map((p) => `<span style="display:flex;gap:6px;align-items:center">
            <span style="width:8px;height:8px;border-radius:50%;background:${
              p.report_count >= 7 ? "#ef4444" : p.report_count >= 3 ? "#f97316" : "#22c55e"
            };display:inline-block;flex-shrink:0"></span>
            ${p.name} — ${p.report_count} report${p.report_count !== 1 ? "s" : ""}
          </span>`)
          .join("");

        const label = `
          <div style="font-family:inherit;min-width:180px">
            <div style="font-weight:700;font-size:11px;color:#374151;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #e5e7eb">
              ${dumpCount} Dump Point${dumpCount !== 1 ? "s" : ""} · ${totalReports} Total Reports
            </div>
            <div style="font-size:11px;color:#4b5563;display:flex;flex-direction:column;gap:4px">
              ${pointLines}
            </div>
          </div>`;

        poly.bindTooltip(label, {
          sticky: true,
          className: "nagarnetra-tooltip",
          opacity: 0.97,
          direction: "top",
        });
      } else {
        poly.bindTooltip(
          `<span style="font-size:11px;color:#6b7280;font-family:inherit">✅ Clean zone — no dump activity</span>`,
          { sticky: true, className: "nagarnetra-tooltip", opacity: 0.9 }
        );
      }

      // Subtle highlight on hover
      poly.on("mouseover", () => poly.setStyle({ fillOpacity: Math.min((style.fillOpacity ?? 0.2) + 0.2, 0.75) }));
      poly.on("mouseout", () => poly.setStyle({ fillOpacity: style.fillOpacity }));

      polygons.push(poly);
    });

    const group = L.layerGroup(polygons).addTo(map);
    layerRef.current = group;

    return () => {
      map.removeLayer(group);
    };
  }, [map, dumpPoints]);

  return null;
}
