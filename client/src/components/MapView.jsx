import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getReportFreshness } from "../utils/reportFreshness";

// Fix Leaflet's default icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
  iconUrl:       new URL("leaflet/dist/images/marker-icon.png",    import.meta.url).href,
  shadowUrl:     new URL("leaflet/dist/images/marker-shadow.png",  import.meta.url).href,
});

// Pin color reflects the age of the returned report (freshness), except the
// selected marker which always uses the blue selected style.
function createMarkerIcon(selected, freshnessKey) {
  const markerClass = selected
    ? "custom-marker selected-marker"
    : `custom-marker marker-${freshnessKey || "older"}`;
  return L.divIcon({
    className: "",
    html: `<div class="${markerClass}"></div>`,
    iconSize:   selected ? [22, 22] : [18, 18],
    iconAnchor: selected ? [11, 11] : [9, 9],
  });
}

// MarkerLayer lives inside MapContainer so useMap() is always ready.
// Three separate effects keep responsibilities isolated:
//   1. Rebuild all markers only when the result set changes (not on selection).
//   2. Swap only the two affected markers' icons when selectedId changes.
//   3. Pan (never zoom) to the selected report.
// This prevents map.setView from resetting the zoom/position on every click.
function MarkerLayer({ results, selectedId, onSelectReport }) {
  const map = useMap();
  const markersRef       = useRef({});
  const prevSelectedRef  = useRef(null);  // tracks which marker is currently styled selected

  // Stable refs so effects can read current prop values without adding them to deps
  const selectedIdRef    = useRef(selectedId);
  const resultsRef       = useRef(results);
  const onSelectRef      = useRef(onSelectReport);
  selectedIdRef.current  = selectedId;
  resultsRef.current     = results;
  onSelectRef.current    = onSelectReport;

  // ── Effect 1: Rebuild markers when result set changes ──────────────────────
  useEffect(() => {
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    results.filter((r) => r.hasCoords).forEach((report) => {
      const isSelected = report.id === selectedIdRef.current;
      const freshness = getReportFreshness(report.observationDateTime);
      const marker = L.marker([report.latitude, report.longitude], {
        icon: createMarkerIcon(isSelected, freshness.key),
        title: `${report.locationName} (${freshness.label.toLowerCase()})`,
      }).addTo(map);

      marker.on("click", () => onSelectRef.current(report));
      markersRef.current[report.id] = marker;
    });

    // After recreation, sync prevSelectedRef so effect 2 tracks the right marker
    prevSelectedRef.current = selectedIdRef.current;
    setTimeout(() => map.invalidateSize(), 50);
  }, [results, map]);

  // ── Effect 2: Swap icons only for the two changed markers ──────────────────
  useEffect(() => {
    const prevId = prevSelectedRef.current;

    // Deselected markers return to their freshness color
    const freshnessKeyFor = (id) => {
      const report = resultsRef.current.find((r) => r.id === id);
      return report ? getReportFreshness(report.observationDateTime).key : "older";
    };

    if (prevId && markersRef.current[prevId]) {
      markersRef.current[prevId].setIcon(createMarkerIcon(false, freshnessKeyFor(prevId)));
    }
    if (selectedId && markersRef.current[selectedId]) {
      markersRef.current[selectedId].setIcon(createMarkerIcon(true));
    }

    prevSelectedRef.current = selectedId;
  }, [selectedId]);

  // ── Effect 3: Pan (not setView) to selected report — zoom is preserved ─────
  useEffect(() => {
    if (!selectedId) return;
    const report = resultsRef.current.find((r) => r.id === selectedId);
    if (report?.hasCoords) {
      map.panTo([report.latitude, report.longitude]);
    }
  }, [selectedId, map]);

  return null;
}

export default function MapView({ searchCenter, radiusKm, results, selectedId, onSelectReport }) {
  // MapContainer's center/zoom props are non-reactive in react-leaflet v4 —
  // they set the initial view once and Leaflet owns the position thereafter.
  // No MapController needed; that was causing setView to fire on every render.
  const center = searchCenter ? [searchCenter.lat, searchCenter.lng] : [39.5, -98.35];
  const zoom   = searchCenter ? (radiusKm <= 10 ? 11 : radiusKm <= 25 ? 9 : 8) : 4;

  return (
    <div className="map-container" style={{ height: "100%", minHeight: "400px" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {searchCenter && (
          <Circle
            center={[searchCenter.lat, searchCenter.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: "#1a73e8", fillColor: "#1a73e8", fillOpacity: 0.05, weight: 2 }}
          />
        )}
        <MarkerLayer
          results={results}
          selectedId={selectedId}
          onSelectReport={onSelectReport}
        />
      </MapContainer>
    </div>
  );
}
