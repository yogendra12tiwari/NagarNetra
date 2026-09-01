import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export default function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    let heatLayer = null;
    let isMounted = true;

    // leaflet.heat requires window.L to be set globally before it loads in Vite
    window.L = L;
    
    import("leaflet.heat").then(() => {
      if (!isMounted) return;

      const maxCount = Math.max(...points.map((p) => p.report_count), 1);
      
      const heatData = points.map((p) => [
        p.lat,
        p.lng,
        (p.report_count / maxCount) * 3.5, // Boost intensity heavily so it pops
      ]);

      heatLayer = L.heatLayer(heatData, {
        radius: 65,     // Larger spread
        blur: 45,       // Smoother edges
        maxZoom: 15,
        max: 1.5,       // Allow slightly higher max before hitting solid red
        gradient: {
          0.2: "#fca5a5", // Red-300
          0.5: "#ef4444", // Red-500
          0.8: "#b91c1c", // Red-700
          1.0: "#7f1d1d", // Red-900
        },
      }).addTo(map);
    });

    return () => {
      isMounted = false;
      if (heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, points]);

  return null;
}
