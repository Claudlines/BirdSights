const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const {
  isOpenAiConfigured,
  interpretQuestion,
  clampRadiusKm,
  clampDaysBack,
} = require("../services/openaiService");
const { loadTaxonomy, findBestSpeciesMatch } = require("../services/taxonomyService");
const { geocodeLocation } = require("../services/geocodingService");
const { fetchRecentObservations } = require("../services/ebirdService");
const { formatAskAnswer } = require("../utils/formatAskAnswer");
const { isBroadLocationName, isBroadGeocodeResult } = require("../utils/broadLocations");

const MAX_QUESTION_LENGTH = 300;

// Protects the paid OpenAI endpoint from spam. Applies only to /api/ask —
// the normal search and species endpoints are not rate-limited.
const RATE_LIMIT_WINDOW_MINUTES =
  parseInt(process.env.ASK_RATE_LIMIT_WINDOW_MINUTES, 10) || 15;
const RATE_LIMIT_MAX = parseInt(process.env.ASK_RATE_LIMIT_MAX, 10) || 20;

const askRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many Ask BirdSights requests. Please wait a few minutes and try again.",
  },
});

function isValidCoord(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function clarification(res, question, extra = {}) {
  return res.json({ needsClarification: true, clarifyingQuestion: question, ...extra });
}

function broadLocationClarification(res, location) {
  return clarification(
    res,
    `${location} is a broad area, and BirdSights currently searches by radius around a specific location. Please enter a city, ZIP code, park, address, or use your current location.`,
    { needsCurrentLocation: true }
  );
}

router.post("/ask", askRateLimiter, async (req, res) => {
  // Optional GPS coordinates from the frontend for "near me" questions
  const hasGps =
    isValidCoord(req.body?.latitude, -90, 90) && isValidCoord(req.body?.longitude, -180, 180);

  let intent;
  const rerun = req.body?.rerun;

  if (rerun && typeof rerun === "object") {
    // Quick-action rerun (e.g. "Try 50 km"): the parameters were already
    // interpreted once, so skip the OpenAI call and search directly.
    intent = {
      birdName: typeof rerun.birdName === "string" ? rerun.birdName.trim() : "",
      location: typeof rerun.location === "string" ? rerun.location.trim() : "",
      radiusKm: clampRadiusKm(rerun.radiusKm),
      daysBack: clampDaysBack(rerun.daysBack),
      intent: "general_activity",
    };
  } else {
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";

    if (!question) {
      return res.status(400).json({ error: "Please enter a question." });
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({
        error: `Please keep your question under ${MAX_QUESTION_LENGTH} characters.`,
      });
    }

    if (!isOpenAiConfigured()) {
      return res.status(503).json({
        error:
          "The Ask BirdSights feature is not configured on this server. The standard search form still works.",
      });
    }

    // Step 1: interpret the question into structured search intent
    try {
      intent = await interpretQuestion(question);
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }

    // Only honor the model's own clarifying question when it found no bird.
    // If a bird was extracted, any hesitation is almost always about the
    // location — our own checks below handle that and include the
    // "use my current location" option.
    if (intent.needsClarification && intent.clarifyingQuestion && !intent.birdName) {
      return clarification(res, intent.clarifyingQuestion);
    }
  }

  if (!intent.birdName) {
    return clarification(
      res,
      "Which bird would you like me to check? For example: Cedar Waxwing or Northern Cardinal."
    );
  }

  if (!intent.location && !hasGps) {
    return clarification(
      res,
      "Which city, address, or ZIP code should I search near? You can also use your current location.",
      { needsCurrentLocation: true }
    );
  }

  // Step 2: reuse the existing taxonomy, geocoding, and eBird services
  let taxonomy;
  try {
    taxonomy = await loadTaxonomy();
  } catch (err) {
    console.error("[Ask] Taxonomy unavailable:", err.message);
    return res.status(503).json({
      error: "The species list is temporarily unavailable. Please try again in a moment.",
    });
  }

  const species = findBestSpeciesMatch(taxonomy, intent.birdName);
  if (!species) {
    return clarification(
      res,
      `BirdSights could not match "${intent.birdName}" to an eBird species. Could you try the bird's full common name, like "Cedar Waxwing"?`
    );
  }

  let searchLat, searchLng, locationLabel;
  let usedGps = false;

  if (intent.location) {
    // States, provinces, and countries are too large for a radius search —
    // ask for a specific place instead of answering as if we covered the area.
    let broad = isBroadLocationName(intent.location);
    let geo = null;
    if (!broad) {
      try {
        geo = await geocodeLocation(intent.location);
      } catch (err) {
        return res.status(422).json({ error: err.message });
      }
      broad = isBroadGeocodeResult(geo);
    }

    if (broad) {
      // If the frontend sent coordinates (the user chose "use my current
      // location" after a broad-area clarification), search there instead.
      if (!hasGps) {
        return broadLocationClarification(res, intent.location);
      }
      usedGps = true;
    } else {
      searchLat = geo.lat;
      searchLng = geo.lng;
      locationLabel = /^\d{5}$/.test(intent.location)
        ? `ZIP code ${intent.location}`
        : intent.location;
    }
  } else {
    usedGps = true;
  }

  if (usedGps) {
    searchLat = req.body.latitude;
    searchLng = req.body.longitude;
    locationLabel = "your current location";
  }

  let results;
  try {
    results = await fetchRecentObservations({
      speciesCode: species.speciesCode,
      lat: searchLat,
      lng: searchLng,
      radiusKm: intent.radiusKm,
      backDays: intent.daysBack,
    });
  } catch (err) {
    const status = err.message.includes("not configured") ? 503 : 502;
    return res.status(status).json({ error: err.message });
  }

  // Step 3: deterministic plain-English summary with safe wording
  const { answer, summary, limitationNote } = formatAskAnswer({
    commonName: species.commonName,
    locationLabel,
    radiusKm: intent.radiusKm,
    daysBack: intent.daysBack,
    results,
  });

  return res.json({
    needsClarification: false,
    answer,
    limitationNote,
    summary: {
      ...summary,
      birdName: species.commonName,
      location: locationLabel,
      radiusKm: intent.radiusKm,
      daysBack: intent.daysBack,
    },
    interpreted: {
      speciesCode: species.speciesCode,
      commonName: species.commonName,
      location: usedGps ? null : intent.location,
      latitude: usedGps ? searchLat : null,
      longitude: usedGps ? searchLng : null,
      radiusKm: intent.radiusKm,
      backDays: intent.daysBack,
      intent: intent.intent,
    },
  });
});

module.exports = router;
