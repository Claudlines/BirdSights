const { formatLocationForSentence, formatLocationForList } = require("./locationNames");

const LIMITATION_NOTE =
  "BirdSights shows the most recent eBird report for this bird at each returned location within the selected timeframe. It does not show every checklist or guarantee the bird is currently present.";

function parseObsTime(dateStr) {
  if (!dateStr) return null;
  const t = new Date(dateStr.replace(" ", "T")).getTime();
  return Number.isNaN(t) ? null : t;
}

function formatDate(time) {
  return new Date(time).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function toLocationEntry(r) {
  const obsTime = parseObsTime(r.observationDateTime);
  return {
    locationName: r.locationName,
    displayName: formatLocationForList(r.locationName),
    distanceKm: r.distanceKm != null ? parseFloat(r.distanceKm.toFixed(1)) : null,
    observationDate: obsTime === null ? null : formatDate(obsTime),
  };
}

function summarizeResults(results) {
  const locationCount = new Set(
    results.map((r) => r.locationId || r.locationName).filter(Boolean)
  ).size;

  let newestTime = null;
  for (const r of results) {
    const t = parseObsTime(r.observationDateTime);
    if (t != null && (newestTime === null || t > newestTime)) newestTime = t;
  }

  // Closest distinct locations first (one entry per location)
  const seen = new Set();
  const byDistance = [];
  for (const r of [...results].sort(
    (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
  )) {
    const key = r.locationId || r.locationName;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    byDistance.push(r);
  }
  const withDistance = byDistance.filter((r) => r.distanceKm != null);

  return {
    nearbySightingLocationCount: locationCount,
    mostRecentReportDate: newestTime === null ? null : formatDate(newestTime),
    closestReport: withDistance.length > 0 ? toLocationEntry(withDistance[0]) : null,
    topLocations: withDistance.slice(0, 3).map(toLocationEntry),
  };
}

// Builds the plain-English answer deterministically so the wording is always
// accurate and safe (no population or presence claims). The limitation note is
// returned separately so the UI can render it once, as a footer.
function formatAskAnswer({ commonName, locationLabel, radiusKm, daysBack, results }) {
  if (results.length === 0) {
    return {
      answer:
        `No recent nearby eBird reports were returned for ${commonName} within ${radiusKm} km of ` +
        `${locationLabel} over the last ${daysBack} days. This does not prove the bird is absent; ` +
        `it only means BirdSights did not receive recent returned reports for that search.`,
      summary: {
        nearbySightingLocationCount: 0,
        mostRecentReportDate: null,
        closestReport: null,
        topLocations: [],
      },
      limitationNote: LIMITATION_NOTE,
    };
  }

  const summary = summarizeResults(results);
  const plural = summary.nearbySightingLocationCount === 1 ? "location" : "locations";

  let answer =
    `Yes. ${commonName} has recent eBird reports at ${summary.nearbySightingLocationCount} ` +
    `nearby sighting ${plural} within ${radiusKm} km of ${locationLabel} over the last ${daysBack} days.`;

  const closest = summary.closestReport;
  if (summary.mostRecentReportDate) {
    answer += ` The most recent returned report was ${summary.mostRecentReportDate}`;
    if (closest) {
      answer += `, and the closest returned report was ${closest.distanceKm} km away at ${formatLocationForSentence(closest.locationName)}.`;
    } else {
      answer += ".";
    }
  } else if (closest) {
    answer += ` The closest returned report was ${closest.distanceKm} km away at ${formatLocationForSentence(closest.locationName)}.`;
  }

  return { answer, summary, limitationNote: LIMITATION_NOTE };
}

module.exports = { formatAskAnswer };
