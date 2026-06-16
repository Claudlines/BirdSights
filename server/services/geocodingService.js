const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const cache = new Map();

async function geocodeLocation(locationString) {
  const key = locationString.trim().toLowerCase();

  if (cache.has(key)) {
    return cache.get(key);
  }

  const userAgent =
    process.env.NOMINATIM_USER_AGENT || "BirdsNearMe/1.0 student-capstone-project";

  const params = new URLSearchParams({ q: locationString.trim(), format: "jsonv2", limit: "1" });
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
