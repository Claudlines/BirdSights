const express = require("express");
const router = express.Router();
const { geocodeLocation } = require("../services/geocodingService");
const { buildExploreList } = require("../services/exploreService");
const {
  isBroadLocationName,
  isBroadGeocodeResult,
  broadLocationSearchMessage,
} = require("../utils/broadLocations");
const { dataRateLimiter } = require("../middleware/rateLimit");

// ── Simple in-memory cache ──────────────────────────────────────────
// One Explore request fans out into multiple eBird calls, so repeated
// requests for the same area/timeframe reuse the previous result instead
// of hitting eBird again (avoids 429 rate limits). No database — entries
// expire after CACHE_TTL_MS and the map is capped so it can't grow forever.
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CACHE_MAX_ENTRIES = 100;
const exploreCache = new Map();

function getCached(key) {
  const entry = exploreCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL_MS) {
    exploreCache.delete(key);
    return null;
  }
  return entry.payload;
}

function setCached(key, payload) {
  if (exploreCache.size >= CACHE_MAX_ENTRIES) {
    // Drop the oldest entry (Map preserves insertion order)
    exploreCache.delete(exploreCache.keys().next().value);
  }
  exploreCache.set(key, { time: Date.now(), payload });
}

router.get("/explore", dataRateLimiter, async (req, res) => {
  const { location, latitude, longitude } = req.query;

  const radiusKm = parseInt(req.query.radiusKm ?? "25", 10);
  const backDays = parseInt(req.query.backDays ?? "30", 10);

  if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 50) {
    return res.status(400).json({ error: "Radius must be between 1 and 50 km." });
  }
  if (!Number.isFinite(backDays) || backDays < 1 || backDays > 30) {
    return res.status(400).json({ error: "Timeframe must be between 1 and 30 days." });
  }

  // Build the cache key from the raw inputs before doing any external work.
  const hasCoords = latitude != null && longitude != null;
  let searchLat, searchLng, trimmedLocation, cacheKey;

  if (hasCoords) {
    searchLat = parseFloat(latitude);
    searchLng = parseFloat(longitude);
    if (
      !Number.isFinite(searchLat) || !Number.isFinite(searchLng) ||
      searchLat < -90 || searchLat > 90 || searchLng < -180 || searchLng > 180
    ) {
      return res.status(400).json({ error: "Invalid coordinates provided." });
    }
    // Round coordinates (~110 m) so repeated GPS requests from the same
    // spot hit the cache despite tiny position jitter.
    cacheKey = `geo:${searchLat.toFixed(3)},${searchLng.toFixed(3)}|r:${radiusKm}|d:${backDays}`;
  } else {
    trimmedLocation = typeof location === "string" ? location.trim() : "";
    if (!trimmedLocation) {
      return res.status(400).json({ error: "Please enter a location or use your current location." });
    }
    cacheKey = `loc:${trimmedLocation.toLowerCase()}|r:${radiusKm}|d:${backDays}`;
  }

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  // Broad-location validation and geocoding (same protection as the
  // standard search). Broad locations return 400 and are never cached.
  let locationLabel;
  if (hasCoords) {
    locationLabel = "Current Location";
  } else {
    if (isBroadLocationName(trimmedLocation)) {
      return res.status(400).json({ error: broadLocationSearchMessage(trimmedLocation) });
    }
    try {
      const geo = await geocodeLocation(trimmedLocation);
      if (isBroadGeocodeResult(geo)) {
        return res.status(400).json({ error: broadLocationSearchMessage(trimmedLocation) });
      }
      searchLat = geo.lat;
      searchLng = geo.lng;
      locationLabel = geo.label;
    } catch (err) {
      return res.status(422).json({ error: err.message });
    }
  }

  let birds;
  try {
    birds = await buildExploreList({ lat: searchLat, lng: searchLng, radiusKm, backDays });
  } catch (err) {
    const status = err.message.includes("not configured") ? 503 : 502;
    return res.status(status).json({ error: err.message });
  }

  const payload = {
    searchCenter: { lat: searchLat, lng: searchLng, label: locationLabel },
    radiusKm,
    backDays,
    birds,
    message:
      birds.length === 0
        ? "No recent nearby eBird reports were found near this location. Try a larger radius, longer timeframe, or different location."
        : null,
  };

  setCached(cacheKey, payload);
  return res.json(payload);
});

module.exports = router;
