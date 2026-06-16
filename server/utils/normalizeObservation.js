const { haversineDistance } = require("./distance");

function normalizeObservation(raw, searchLat, searchLng) {
  const lat = raw.lat != null ? parseFloat(raw.lat) : null;
  const lng = raw.lng != null ? parseFloat(raw.lng) : null;

  const hasCoords = lat !== null && !isNaN(lat) && lng !== null && !isNaN(lng);

  const subId = raw.subId || raw.subID || null;
  const locId = raw.locId || raw.locID || null;

  return {
    id: `${locId || "noloc"}-${subId || Date.now()}`,
    speciesCode: raw.speciesCode || "",
    commonName: raw.comName || "Unknown Species",
    scientificName: raw.sciName || "",
    locationId: locId,
    locationName: raw.locName || "Unnamed eBird Location",
    observationDateTime: raw.obsDt || null,
    numberObserved: raw.howMany != null ? raw.howMany : null,
    latitude: hasCoords ? lat : null,
    longitude: hasCoords ? lng : null,
    hasCoords,
    distanceKm:
      hasCoords
        ? haversineDistance(searchLat, searchLng, lat, lng)
        : null,
    observationValid: raw.obsValid === true,
    observationReviewed: raw.obsReviewed === true,
    locationPrivate: raw.locationPrivate === true,
    checklistSubmissionId: subId,
    checklistUrl: subId ? `https://ebird.org/checklist/${subId}` : null,
  };
}

module.exports = { normalizeObservation };
