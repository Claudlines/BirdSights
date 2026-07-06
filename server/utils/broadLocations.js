// Detects "broad" locations (states, provinces, countries, large regions).
// BirdSights searches by radius around a point, so geocoding e.g. "New Jersey"
// to a single point and searching 25 km around it would be misleading.

// US states/territories, Canadian provinces, and common country phrasings.
const BROAD_NAMES = new Set([
  // US states
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
  "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
  "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine",
  "maryland", "massachusetts", "michigan", "minnesota", "mississippi",
  "missouri", "montana", "nebraska", "nevada", "new hampshire", "new jersey",
  "new mexico", "new york", "new york state", "north carolina", "north dakota",
  "ohio", "oklahoma", "oregon", "pennsylvania", "rhode island",
  "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont",
  "virginia", "washington", "washington state", "west virginia", "wisconsin",
  "wyoming",
  // US territories
  "puerto rico", "guam", "american samoa", "us virgin islands",
  // Canadian provinces and territories
  "alberta", "british columbia", "manitoba", "new brunswick",
  "newfoundland and labrador", "northwest territories", "nova scotia",
  "nunavut", "ontario", "prince edward island", "quebec", "saskatchewan",
  "yukon",
  // Countries / large regions
  "united states", "united states of america", "usa", "us", "u.s.", "u.s.a.",
  "america", "north america", "canada", "mexico", "united kingdom", "uk",
  "england", "scotland", "wales", "ireland", "australia",
]);

function isBroadLocationName(location) {
  if (!location) return false;
  const n = location.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.]+$/, "");
  return BROAD_NAMES.has(n) || BROAD_NAMES.has(n.replace(/^the /, ""));
}

// Nominatim address types for large administrative areas
const BROAD_ADDRESS_TYPES = new Set([
  "country", "state", "region", "province", "territory", "continent",
  "archipelago", "sea", "ocean",
]);

// Nominatim place_rank: 4 = country, 5-9 = state/region level.
// Counties (10-12) and anything more specific are allowed.
function isBroadGeocodeResult(geo) {
  if (geo?.addressType && BROAD_ADDRESS_TYPES.has(geo.addressType)) return true;
  if (typeof geo?.placeRank === "number" && geo.placeRank > 0 && geo.placeRank <= 9) return true;
  return false;
}

// Names that are ambiguous rather than plainly broad (state vs. major city)
const AMBIGUOUS_NAMES = new Set(["new york", "washington", "georgia"]);

// User-facing error for the standard search form when a broad or ambiguous
// location is entered. Ask BirdSights has its own clarification wording.
function broadLocationSearchMessage(location) {
  const trimmed = (location || "").trim();
  const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");
  const descriptor = AMBIGUOUS_NAMES.has(normalized) ? "broad or ambiguous" : "a broad area";
  return `${trimmed} is ${descriptor}. BirdSights searches by radius around a specific place. Please enter a city, ZIP code, park, address, or use current location.`;
}

module.exports = { isBroadLocationName, isBroadGeocodeResult, broadLocationSearchMessage };
