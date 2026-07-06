// Helpers for the Bird Activity Summary card. All values are derived from
// the results already returned for the current search — no extra API calls.

export function getActivityLabel(resultCount) {
  if (resultCount === 0) return "No recent nearby reports";
  if (resultCount <= 2) return "Rarely reported nearby";
  if (resultCount <= 9) return "Occasionally reported nearby";
  return "Frequently reported nearby";
}

function parseDateStr(dateStr) {
  if (!dateStr) return null;
  const time = new Date(dateStr.replace(" ", "T")).getTime();
  return Number.isNaN(time) ? null : time;
}

// Returns the newest observation date formatted like "July 5, 2026",
// or null if no result has a parseable date.
export function getMostRecentReportDate(results) {
  let newest = null;
  for (const r of results) {
    const time = parseDateStr(r.observationDateTime);
    if (time != null && (newest === null || time > newest)) newest = time;
  }
  if (newest === null) return null;
  return new Date(newest).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Fallback only — the server already provides distanceKm for results
// that have coordinates.
function haversineKm(lat1, lng1, lat2, lng2) {
  const EARTH_RADIUS_KM = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns the distance in km of the closest report, or null if no result
// has a usable distance.
export function getClosestReportKm(results, searchCenter) {
  let closest = null;
  for (const r of results) {
    let d = r.distanceKm;
    if (d == null && searchCenter && r.latitude != null && r.longitude != null) {
      d = haversineKm(searchCenter.lat, searchCenter.lng, r.latitude, r.longitude);
    }
    if (d != null && (closest === null || d < closest)) closest = d;
  }
  return closest;
}
