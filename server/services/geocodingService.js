const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const cache = new Map();

// Match exactly 5 digits (U.S. ZIP code format)
function isUsZip(str) {
  return /^\d{5}$/.test(str.trim());
}

async function geocodeLocation(locationString) {
  const trimmed = locationString.trim();
  const key = trimmed.toLowerCase();

  if (cache.has(key)) {
    return cache.get(key);
  }

  const userAgent =
    process.env.NOMINATIM_USER_AGENT || "BirdsNearMe/1.0 student-capstone-project";

  // For 5-digit ZIP codes use postalcode + countrycodes=us so Nominatim
  // doesn't resolve them to non-US postal codes (e.g. Lithuanian postcodes).
  let params;
  if (isUsZip(trimmed)) {
    params = new URLSearchParams({
      postalcode: trimmed,
      countrycodes: "us",
      format: "jsonv2",
      limit: "1",
    });
  } else {
    params = new URLSearchParams({ q: trimmed, format: "jsonv2", limit: "1" });
  }

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error("[Geocoding] Network error:", err.message);
    throw new Error("The geocoding service is currently unavailable. Please try again later.");
  }

  if (response.status === 429) {
    throw new Error("The geocoding service is temporarily rate-limited. Please try again in a moment.");
  }

  if (!response.ok) {
    console.error("[Geocoding] HTTP error:", response.status);
    throw new Error("The geocoding service returned an unexpected error. Please try again.");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    console.error("[Geocoding] Invalid JSON response");
    throw new Error("The geocoding service returned an unreadable response. Please try again.");
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      `We could not find coordinates for "${locationString}". Try a different address, city, or ZIP code.`
    );
  }

  const result = {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    label: data[0].display_name || locationString,
  };

  cache.set(key, result);
  return result;
}

module.exports = { geocodeLocation };
