const VALID_RADII = [5, 10, 25, 50];
const VALID_BACK_DAYS = [7, 14, 30];

function validateSearchParams({ speciesCode, location, latitude, longitude, radiusKm, backDays }) {
  if (!speciesCode || typeof speciesCode !== "string" || !speciesCode.trim()) {
    return "speciesCode is required.";
  }

  const hasManualLocation = location && typeof location === "string" && location.trim();
  const lat = latitude != null ? parseFloat(latitude) : null;
  const lng = longitude != null ? parseFloat(longitude) : null;
  const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

  if (!hasManualLocation && !hasCoords) {
    return "Either a location string or latitude/longitude coordinates are required.";
  }

  if (latitude != null && (isNaN(lat) || lat < -90 || lat > 90)) {
    return "latitude must be a number between -90 and 90.";
  }

  if (longitude != null && (isNaN(lng) || lng < -180 || lng > 180)) {
    return "longitude must be a number between -180 and 180.";
  }

  const radius = parseInt(radiusKm, 10);
  if (isNaN(radius) || !VALID_RADII.includes(radius)) {
    return `radiusKm must be one of: ${VALID_RADII.join(", ")}.`;
  }

  if (backDays != null) {
    const back = parseInt(backDays, 10);
    if (isNaN(back) || !VALID_BACK_DAYS.includes(back)) {
      return `backDays must be one of: ${VALID_BACK_DAYS.join(", ")}.`;
    }
  }

  return null;
}

module.exports = { validateSearchParams };
