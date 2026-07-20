const express = require("express");
const router = express.Router();
const { geocodeLocation } = require("../services/geocodingService");
const { fetchRecentObservations } = require("../services/ebirdService");
const { validateSearchParams } = require("../utils/validateSearchParams");
const {
  isBroadLocationName,
  isBroadGeocodeResult,
  broadLocationSearchMessage,
} = require("../utils/broadLocations");
const { dataRateLimiter } = require("../middleware/rateLimit");

const DEFAULT_BACK_DAYS = 7;

// Safety cap on how many returned reports (and therefore map pins) a single
// search sends to the frontend. A common bird over a wide radius and long
// timeframe in a dense area can return a very large set; rendering one marker
// per report would bloat the payload and overload the map. When exceeded we
// keep the most recent reports so the freshest sightings and pins are shown.
const MAX_RETURNED_REPORTS = 500;

function obsTimeMs(dateStr) {
  if (!dateStr) return 0;
  const t = new Date(String(dateStr).replace(" ", "T")).getTime();
  return Number.isNaN(t) ? 0 : t;
}

router.get("/search", dataRateLimiter, async (req, res) => {
  const { speciesCode, location, latitude, longitude, radiusKm, backDays } = req.query;

  // Resolve backDays: default to 7 if not provided, validated below if provided
  const resolvedBackDays =
    backDays != null ? parseInt(backDays, 10) : DEFAULT_BACK_DAYS;

  const validationError = validateSearchParams({
    speciesCode,
    location,
    latitude,
    longitude,
    radiusKm,
    backDays,
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
      // States, provinces, and countries are too large for a radius search —
      // reject with a friendly message instead of searching a single point.
      if (isBroadLocationName(location)) {
        return res.status(400).json({ error: broadLocationSearchMessage(location) });
      }
      const geo = await geocodeLocation(location);
      if (isBroadGeocodeResult(geo)) {
        return res.status(400).json({ error: broadLocationSearchMessage(location) });
      }
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
      backDays: resolvedBackDays,
    });
  } catch (err) {
    const status = err.message.includes("not configured") ? 503 : 502;
    return res.status(status).json({ error: err.message });
  }

  // Apply the map/payload safety cap. Keep the most recent returned reports so
  // the newest sightings and freshest pins survive when a search is trimmed.
  const totalReturnedReports = observations.length;
  const capped = totalReturnedReports > MAX_RETURNED_REPORTS;
  if (capped) {
    observations = [...observations]
      .sort((a, b) => obsTimeMs(b.observationDateTime) - obsTimeMs(a.observationDateTime))
      .slice(0, MAX_RETURNED_REPORTS);
  }

  // Return all raw normalized observations — grouping, sorting, and pagination
  // are handled client-side so the frontend can switch modes without re-fetching.
  return res.json({
    searchCenter: { lat: searchLat, lng: searchLng, label: locationLabel },
    speciesCode,
    radiusKm: parseInt(radiusKm, 10),
    backDays: resolvedBackDays,
    results: observations,
    totalReturnedReports,
    returnedReportCount: observations.length,
    capped,
    capNotice: capped
      ? `This search returned ${totalReturnedReports} recent eBird reports. To keep the map responsive, BirdSights is showing the ${MAX_RETURNED_REPORTS} most recent returned reports.`
      : null,
    message:
      totalReturnedReports === 0
        ? "No recent eBird reports were found for this species within the selected radius and timeframe. Try a larger radius, longer timeframe, or different location."
        : null,
  });
});

module.exports = router;
