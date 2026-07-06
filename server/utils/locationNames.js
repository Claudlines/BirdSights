// Some eBird hotspot/personal-location names are generic ("Home", "My Backyard",
// "Yard feeder"). Displaying those verbatim can read like BirdSights is directing
// the user to a private home, so they are labeled as eBird location names instead.

const GENERIC_PATTERN =
  /\b(home|house|yard|backyard|back yard|front yard|garden|feeder|feeders|patio|deck|balcony|apartment|apt|residence|driveway|neighborhood)\b/i;

function isGenericLocationName(name) {
  if (!name) return false;
  const trimmed = name.trim();
  // Long names are almost always real place names (parks, refuges, streets)
  if (trimmed.length > 20) return false;
  return GENERIC_PATTERN.test(trimmed) || /^(my|our)\b/i.test(trimmed);
}

// For use mid-sentence: "…was 1.2 km away at an eBird location named “Home”."
function formatLocationForSentence(name) {
  return isGenericLocationName(name) ? `an eBird location named “${name}”` : name;
}

// For use in lists: `eBird location named “Home”`
function formatLocationForList(name) {
  return isGenericLocationName(name) ? `eBird location named “${name}”` : name;
}

module.exports = { isGenericLocationName, formatLocationForSentence, formatLocationForList };
