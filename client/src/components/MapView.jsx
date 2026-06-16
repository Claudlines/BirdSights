import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
  iconUrl:       new URL("leaflet/dist/images/marker-icon.png",    import.meta.url).href,
  shadowUrl:     new URL("leaflet/dist/images/marker-shadow.png",  import.meta.url).href,
});

function createMarkerIcon(selected) {
  return L.divIcon({
    className: "",
    html: `<div class="custom-marker${selected ? " selected-marker" : ""}"></div>`,
    iconSize:   selected ? [22, 22] : [18, 18],
    iconAnchor: selected ? [11, 11] : [9, 9],
  });
}

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom());
  }, [center, zoom, map]);
  return null;
}

// MarkerLayer lives inside MapContainer so useMap() is always ready.
// This avoids the timing issue where mapRef.current was null on first render.
function MarkerLayer({ results, selectedId, onSelectReport }) {
  const map = useMap();
  const markersRef = useRef({});
  // Keep a stable ref to the callback so marker click handlers never go stale
  const onSelectRef = useRef(onSelectReport);
  useEffect(() => { onSelectRef.current = onSelectReport; });

  useEffect(() => {
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    results.filter((r) => r.hasCoords).forEach((report) => {
      const isSelected = report.id === selectedId;
      const marker = L.marker([report.latitude, report.longitude], {
        icon: createMarkerIcon(isSelected),
        title: report.locationName,
      }).addTo(map);

      marker.on("click", () => {
        onSelectRef.current(report);
        map.setView([report.latitude, report.longitude], map.getZoom());
      });

      markersRef.current[report.id] = marker;
    });

    // Recalculate tile layout after the results panel changes the grid dimensions
    setTimeout(() => map.invalidateSize(), 50);
  }, [results, selectedId, map]);

  // Pan map when a report is selected from the list
  useEffect(() => {
    if (!selectedId) return;
    const report = results.find((r) => r.id === selectedId);
    if (report?.hasCoords) {
      map.setView([report.latitude, report.longitude], map.getZoom());
    }
  }, [selectedId, results, map]);

  return null;
}

export default function MapView({ searchCenter, radiusKm, results, selectedId, onSelectReport }) {
  const center = searchCenter
    ? [searchCenter.lat, searchCenter.lng]
    : [39.5, -98.35];

  const zoom = searchCenter ? (radiusKm <= 10 ? 11 : radiusKm <= 25 ? 9 : 8) : 4;

  return (
    <div className="map-container" style={{ height: "100%", minHeight: "400px" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
      >
        <MapController center={searchCenter ? [searchCenter.lat, searchCenter.lng] : null} zoom={zoom} />
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
