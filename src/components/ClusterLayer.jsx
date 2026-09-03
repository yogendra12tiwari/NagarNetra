import { useEffect, useState, useMemo } from "react";
import { useMap, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import useSupercluster from "use-supercluster";

// Accepts the full point object so we can check status
function pinColor(point) {
  if (point.status === "unmanaged") return "#a855f7"; // purple
  if (point.report_count >= 7) return "#ef4444";      // red
  if (point.report_count >= 3) return "#f97316";      // orange
  return "#22c55e";                                   // green
}

// ─── Minimal Pill Cluster ──────────────────────────────────────────────────────
// A clean, highly readable pill shape inspired by Airbnb/Modern maps.
// Shows a glowing dot for dominant severity + the total count.
function createMinimalPillCluster(clusterCount, properties) {
  const { red = 0, org = 0, grn = 0, prp = 0 } = properties;

  // Determine dominant severity color (unmanaged purple takes priority)
  let dominantColor = "#22c55e";
  if (prp > 0) dominantColor = "#a855f7";
  else if (red > 0 && red >= org && red >= grn) dominantColor = "#ef4444";
  else if (org > 0 && org >= grn) dominantColor = "#f97316";

  const text = clusterCount >= 1000 ? (clusterCount / 1000).toFixed(1) + 'k' : clusterCount;
  
  // Estimate width for centering: ~28px for padding + ~8px per character
  const estimatedWidth = 32 + (text.toString().length * 8);

  const html = `
    <div style="
      background: white;
      border: 1px solid #e5e7eb;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border-radius: 9999px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 0 10px;
      pointer-events: auto;
    ">
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: ${dominantColor};
        box-shadow: 0 0 4px ${dominantColor};
      "></div>
      <span style="
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-size: 13px;
        font-weight: 700;
        color: #111827;
        letter-spacing: -0.3px;
        line-height: 1;
      ">${text}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: "minimal-pill-cluster",
    iconSize: L.point(estimatedWidth, 26),
    iconAnchor: [estimatedWidth / 2, 13],
  });
}

function createSingleIcon(point) {
  const color = pinColor(point);
  const isUnmanaged = point.status === "unmanaged";
  const html = isUnmanaged
    ? `<div class="nagarnetra-marker" style="--marker-color: ${color}; pointer-events: none;">
        <div style="width:22px;height:22px;border-radius:50%;background:${color}22;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div style="width:10px;height:10px;border-radius:50%;background:${color};"></div>
        </div>
       </div>`
    : `<div class="nagarnetra-marker" style="--marker-color: ${color}; pointer-events: none;">
        <div class="nagarnetra-marker-pulse" style="pointer-events: none;"></div>
        <div class="nagarnetra-marker-core" style="transform: scale(1.1); pointer-events: none;"></div>
       </div>`;
  return L.divIcon({ html, className: "custom-div-icon", iconSize: [24, 24], iconAnchor: [12, 12] });
}

export default function ClusterLayer({ dumpPoints, onPointClick }) {
  const map = useMap();
  const [bounds, setBounds] = useState(null);
  const [zoom, setZoom] = useState(12);

  // Update bounds/zoom on map move
  useEffect(() => {
    function update() {
      const b = map.getBounds();
      setBounds([
        b.getSouthWest().lng,
        b.getSouthWest().lat,
        b.getNorthEast().lng,
        b.getNorthEast().lat
      ]);
      setZoom(map.getZoom());
    }

    update();
    map.on("moveend", update);
    return () => { map.off("moveend", update); };
  }, [map]);

  const points = useMemo(() => {
    return (dumpPoints || [])
      .filter(pt => pt && typeof pt.lat === "number" && !isNaN(pt.lat) && typeof pt.lng === "number" && !isNaN(pt.lng))
      .map(pt => ({
        type: "Feature",
        properties: {
          cluster: false,
          ptId: pt.id,
          point: pt,
          report_count: pt.report_count || 1,
          status: pt.status || "active",
        },
        geometry: { type: "Point", coordinates: [pt.lng, pt.lat] }
      }));
  }, [dumpPoints]);

  const superclusterOptions = useMemo(() => ({
    radius: 75,
    maxZoom: 18,
    map: (props) => ({
      red: props.report_count >= 7 && props.status !== "unmanaged" ? 1 : 0,
      org: props.report_count >= 3 && props.report_count < 7 && props.status !== "unmanaged" ? 1 : 0,
      grn: props.report_count < 3 && props.status !== "unmanaged" ? 1 : 0,
      prp: props.status === "unmanaged" ? 1 : 0,
    }),
    reduce: (acc, props) => {
      acc.red += props.red;
      acc.org += props.org;
      acc.grn += props.grn;
      acc.prp += props.prp;
    }
  }), []);

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom,
    options: superclusterOptions
  });

  return (
    <>
      {clusters.map(cluster => {
        const [longitude, latitude] = cluster.geometry.coordinates;
        const { cluster: isCluster, point_count: pointCount } = cluster.properties;

        if (isCluster) {
          return (
            <Marker
              key={`cluster-${cluster.id}`}
              position={[latitude, longitude]}
              icon={createMinimalPillCluster(pointCount, cluster.properties)}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(cluster.id), 18);
                  map.setView([latitude, longitude], expansionZoom, { animate: true });
                }
              }}
            />
          );
        }

        const pt = cluster.properties.point;
        return (
          <Marker
            key={pt.id}
            position={[latitude, longitude]}
            icon={createSingleIcon(pt)}
            eventHandlers={{ click: () => onPointClick(pt) }}
          >
            <Tooltip direction="top" offset={[0, -4]} className="nagarnetra-tooltip">
              <div style={{ fontFamily: "inherit" }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#1a202c" }}>{pt.name}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{pt.report_count} reports</div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
