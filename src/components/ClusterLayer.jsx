import { useEffect, useState, useMemo } from "react";
import { useMap, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import useSupercluster from "use-supercluster";

export function getHazardPinColor(hazard) {
  if (!hazard) return "#eab308";
  if (hazard.needs_human_review || hazard.hazard_type === "unrelated_or_uncertain") {
    return "#a855f7"; // purple - review required
  }
  const score = typeof hazard.risk_score === "number" ? hazard.risk_score : 50;
  if (score >= 75 || hazard.priority_label === "Critical" || hazard.severity_level === "critical") {
    return "#ef4444"; // red - critical (75-100)
  }
  if (score >= 50 || hazard.priority_label === "High" || hazard.severity_level === "high") {
    return "#f97316"; // orange - high (50-74)
  }
  if (score >= 25 || hazard.priority_label === "Medium" || hazard.severity_level === "medium") {
    return "#eab308"; // amber - medium (25-49)
  }
  return "#22c55e"; // green - low (1-24)
}

function getPriorityBand(hazard) {
  if (hazard.needs_human_review || hazard.hazard_type === "unrelated_or_uncertain") return "review";
  const score = typeof hazard.risk_score === "number" ? hazard.risk_score : 50;
  if (score >= 75 || hazard.priority_label === "Critical") return "critical";
  if (score >= 50 || hazard.priority_label === "High") return "high";
  if (score >= 25 || hazard.priority_label === "Medium") return "med";
  return "low";
}

// ─── Minimal Pill Cluster ──────────────────────────────────────────────────────
function createMinimalPillCluster(clusterCount, properties) {
  const { red = 0, org = 0, amb = 0, prp = 0 } = properties;

  // Determine dominant severity color (critical red and review purple get prominent highlighting)
  let dominantColor = "#22c55e";
  if (red > 0) dominantColor = "#ef4444";
  else if (org > 0) dominantColor = "#f97316";
  else if (prp > 0) dominantColor = "#a855f7";
  else if (amb > 0) dominantColor = "#eab308";

  const text = clusterCount >= 1000 ? (clusterCount / 1000).toFixed(1) + "k" : clusterCount;
  const estimatedWidth = 34 + (text.toString().length * 8);

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
      cursor: pointer;
    ">
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: ${dominantColor};
        box-shadow: 0 0 5px ${dominantColor};
      "></div>
      <span style="
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-size: 12px;
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

function createSingleIcon(hazard, isSelected = false) {
  const color = getHazardPinColor(hazard);
  const isReview = hazard.needs_human_review || hazard.hazard_type === "unrelated_or_uncertain";
  const isCritical = (hazard.risk_score || 0) >= 75 || hazard.priority_label === "Critical";

  const html = `
    <div class="reference-map-pin ${isSelected ? 'reference-pin-selected' : ''}" style="--pin-color: ${color}; pointer-events: none;">
      <div class="reference-pin-outer" style="background: ${color}35;"></div>
      <div class="reference-pin-inner" style="background: ${color};">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({ html, className: "custom-div-icon", iconSize: [32, 32], iconAnchor: [16, 16] });
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
      .map(pt => {
        const priorityBand = getPriorityBand(pt);
        return {
          type: "Feature",
          properties: {
            cluster: false,
            ptId: pt.ticket_id || pt.id,
            point: pt,
            priorityBand,
            needs_review: Boolean(pt.needs_human_review),
            report_count: pt.report_count || 1,
            status: pt.status || "reported",
          },
          geometry: { type: "Point", coordinates: [pt.lng, pt.lat] }
        };
      });
  }, [dumpPoints]);

  const superclusterOptions = useMemo(() => ({
    radius: 70,
    maxZoom: 18,
    map: (props) => ({
      red: props.priorityBand === "critical" ? 1 : 0,
      org: props.priorityBand === "high" ? 1 : 0,
      amb: props.priorityBand === "med" ? 1 : 0,
      grn: props.priorityBand === "low" ? 1 : 0,
      prp: props.priorityBand === "review" ? 1 : 0,
    }),
    reduce: (acc, props) => {
      acc.red += props.red;
      acc.org += props.org;
      acc.amb += props.amb;
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
        const ticketId = pt.ticket_id || pt.community_id || pt.id;
        const categoryName = pt.category || pt.hazard_type || pt.name || "Road Hazard";
        const riskScore = pt.risk_score ?? Math.min(99, (pt.report_count || 1) * 15);
        const priorityLabel = pt.priority_label || (riskScore >= 75 ? "Critical" : riskScore >= 50 ? "High" : riskScore >= 25 ? "Medium" : "Low");

        return (
          <Marker
            key={pt.id || ticketId}
            position={[latitude, longitude]}
            icon={createSingleIcon(pt)}
            eventHandlers={{ click: () => onPointClick(pt) }}
          >
            <Tooltip direction="top" offset={[0, -6]} className="nagarnetra-tooltip">
              <div style={{ fontFamily: "inherit", padding: "2px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <span style={{ fontWeight: 800, fontSize: "11px", color: "#4f46e5", fontFamily: "monospace" }}>{ticketId}</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: getHazardPinColor(pt) }}>{priorityLabel}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: "12px", color: "#111827", marginTop: "2px" }}>{categoryName}</div>
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                  Risk: <strong>{riskScore}/100</strong> • Status: {pt.status || "reported"}
                </div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
