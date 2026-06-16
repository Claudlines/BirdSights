const express = require("express");
const router = express.Router();
const { geocodeLocation } = require("../services/geocodingService");
const { fetchRecentObservations } = require("../services/ebirdService");
const { groupReports } = require("../utils/groupReports");
const { sortReports } = require("../utils/sortReports");
const { validateSearchParams } = require("../utils/validateSearchParams");

const MAX_RESULTS = 10;

router.get("/search", async (req, res) => {
  const {
    speciesCode,
    location,
    latitude,
    longitude,
    radiusKm,
    showAllReports,
    showAllSightings,
  } = req.query;

  const showAll =
    showAllReports === "true" || showAllSightings === "true";

  const validationError = validateSearchParams({
    speciesCode,
    location,
    latitude,
    longitude,
    radiusKm,
  });

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  let searchLat, searchLng, locationLabel;

  try {
    if (latitude != null && longitude != null) {
      searchLat = parseFloat(latitude);
      searchLng = parseFloat(longitude);
      locationLabel = "Current Location";
    } else {
      const geo = await geocodeLocation(location);
      searchLat = geo.lat;
      searchLng = geo.lng;
      locationLabel = geo.label;
    }
  } catch (err) {
    return res.status(422).json({ error: err.message });
  }

  let observations;
  try {
    observations = await fetchRecentObservations({
      speciesCode: speciesCode.trim(),
      lat: searchLat,
      lng: searchLng,
      radiusKm: parseInt(radiusKm, 10),
    });
  } catch (err) {
    const status = err.message.includes("not configured") ? 503 : 502;
    return res.status(status).json({ error: err.message });
  }

  if (observations.length === 0) {
    return res.json({
      searchCenter: { lat: searchLat, lng: searchLng, label: locationLabel },
      speciesCode,
      radiusKm: parseInt(radiusKm, 10),
      mode: showAll ? "individual" : "grouped",
      results: [],
      message:
        "No recent eBird reports were found for this species within the selected radius. Try a larger radius or a different location.",
    });
  }

  let results;
  let mode;

  if (showAll) {
    results = sortReports(observations).slice(0, MAX_RESULTS).map((obs) => ({
      ...obs,
      reportCountAtLocation: 1,
      additionalReturnedReports: 0,
    }));
    mode = "individual";
  } else {
    const grouped = groupReports(observations);
    results = sortReports(grouped).slice(0, MAX_RESULTS);
    mode = "grouped";
  }

  return res.json({
    searchCenter: { lat: searchLat, lng: searchLng, label: locationLabel },
    speciesCode,
    radiusKm: parseInt(radiusKm, 10),
    mode,
    results,
    message: results.length === 0
      ? "No recent eBird reports were found for this species within the selected radius. Try a larger radius or a different location."
      : null,
  });
});

module.exports = router;
