const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
const { normalizeObservation } = require("../utils/normalizeObservation");

const EBIRD_BASE = "https://api.ebird.org/v2";

async function fetchRecentObservations({ speciesCode, lat, lng, radiusKm, backDays = 7 }) {
  const apiKey = process.env.EBIRD_API_KEY;

  if (!apiKey || apiKey === "your_ebird_api_key_here") {
    throw new Error(
      "The eBird API key is not configured. Please add EBIRD_API_KEY to the backend environment variables."
    );
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    dist: String(radiusKm),
    back: String(backDays),
    maxResults: "10000",
    includeProvisional: "false",
  });

  const url = `${EBIRD_BASE}/data/obs/geo/recent/${encodeURIComponent(speciesCode)}?${params.toString()}`;

  let response;
  try {
    response = await fetch(url, {
      headers: { "x-ebirdapitoken": apiKey },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error("[eBird] Network error:", err.message);
    throw new Error("The eBird API is currently unavailable. Please try again later.");
  }

  if (response.status === 429) {
    throw new Error("The eBird API is temporarily rate-limited. Please try again in a moment.");
  }

  if (response.status === 204) {
    return [];
  }

  if (response.status === 400) {
    const text = await response.text().catch(() => "");
    console.error("[eBird] 400 error:", text);
    throw new Error(
      "The eBird API did not recognize the provided parameters. Please check the species code or location."
    );
  }

  if (response.status === 401 || response.status === 403) {
    console.error("[eBird] Auth error:", response.status);
    throw new Error(
      "The eBird API key is invalid or unauthorized. Please verify your EBIRD_API_KEY."
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("[eBird] Unexpected HTTP error:", response.status, text.slice(0, 200));
    throw new Error("The eBird API returned an unexpected error. Please try again later.");
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    console.error("[eBird] Non-JSON response:", text.slice(0, 200));
    throw new Error("The eBird API returned an unreadable response. Please try again.");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    console.error("[eBird] JSON parse error");
    return [];
  }

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map((raw) => normalizeObservation(raw, lat, lng));
}

function requireApiKey() {
  const apiKey = process.env.EBIRD_API_KEY;
  if (!apiKey || apiKey === "your_ebird_api_key_here") {
    throw new Error(
      "The eBird API key is not configured. Please add EBIRD_API_KEY to the backend environment variables."
    );
  }
  return apiKey;
}

// Shared fetch for the Explore endpoints — returns a raw eBird record array.
async function fetchEbirdList(url, apiKey) {
  let response;
  try {
    response = await fetch(url, {
      headers: { "x-ebirdapitoken": apiKey },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error("[eBird] Network error:", err.message);
    throw new Error("The eBird API is currently unavailable. Please try again later.");
  }

  if (response.status === 429) {
    throw new Error("The eBird API is temporarily rate-limited. Please try again in a moment.");
  }
  if (response.status === 204) return [];
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("[eBird] HTTP error:", response.status, text.slice(0, 200));
    throw new Error("The eBird API returned an unexpected error. Please try again later.");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    console.error("[eBird] JSON parse error");
    return [];
  }
  return Array.isArray(data) ? data : [];
}

// All species recently reported nearby. eBird returns ONE most-recent record
// per species, so this gives a species pool but no per-species frequency.
async function fetchNearbySpecies({ lat, lng, radiusKm, backDays }) {
  const apiKey = requireApiKey();
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    dist: String(radiusKm),
    back: String(backDays),
    maxResults: "10000",
    includeProvisional: "false",
  });
  return fetchEbirdList(`${EBIRD_BASE}/data/obs/geo/recent?${params.toString()}`, apiKey);
}

// Locally notable (unusual) recent reports nearby — multiple records per species.
async function fetchNotableObservations({ lat, lng, radiusKm, backDays }) {
  const apiKey = requireApiKey();
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    dist: String(radiusKm),
    back: String(backDays),
    maxResults: "10000",
  });
  return fetchEbirdList(`${EBIRD_BASE}/data/obs/geo/recent/notable?${params.toString()}`, apiKey);
}

module.exports = { fetchRecentObservations, fetchNearbySpecies, fetchNotableObservations };
