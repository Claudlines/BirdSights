const {
  fetchRecentObservations,
  fetchNearbySpecies,
  fetchNotableObservations,
} = require("./ebirdService");

// Category thresholds match the Bird Activity Summary labels:
// 10+ returned locations = frequent, 3-9 = occasional, 1-2 = few.
const CATEGORY_LABELS = {
  frequent: "Frequently reported nearby",
  occasional: "Occasionally reported nearby",
  notable: "Notable or uncommon nearby",
  few: "Few recent reports",
};

const TARGETS = { frequent: 3, occasional: 3, notable: 3, few: 1 };
const TOTAL_BIRDS = 10;

// How many random species to look up per-species counts for. Kept small so
// one Explore request stays a modest number of eBird calls, and looked up in
// small batches so we don't burst-trigger eBird rate limiting.
const CANDIDATE_SAMPLE_SIZE = 10;
const LOOKUP_BATCH_SIZE = 5;

// Fisher-Yates shuffle (returns a copy)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseObsTime(dateStr) {
  if (!dateStr) return null;
  const t = new Date(dateStr.replace(" ", "T")).getTime();
  return Number.isNaN(t) ? null : t;
}

// Newest date across records; works for raw eBird records (obsDt) and
// normalized ones (observationDateTime).
function newestReportDate(records) {
  let newest = null;
  for (const r of records) {
    const t = parseObsTime(r.observationDateTime || r.obsDt);
    if (t != null && (newest === null || t > newest)) newest = t;
  }
  if (newest === null) return null;
  return new Date(newest).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Beginner-friendly filter: skip hybrids ("x"), spuhs ("sp."), slashes, and
// domestic types, which are eBird record types rather than clean species.
function isSpeciesLevel(comName) {
  return !/( x |hybrid|sp\.|\/|domestic)/i.test(comName || "");
}

function categoryFor(locationCount) {
  if (locationCount >= 10) return "frequent";
  if (locationCount >= 3) return "occasional";
  return "few";
}

function reasonFor(category, locationCount, backDays) {
  if (category === "few") {
    const noun = locationCount === 1 ? "returned report" : "returned reports";
    return `Only ${locationCount} recent ${noun} nearby in the last ${backDays} days.`;
  }
  return `Recently returned from ${locationCount} nearby report locations in the last ${backDays} days.`;
}

// Internal result cache keyed by rounded coordinates. Both callers
// (/api/explore and Ask BirdSights explore answers) fan out into multiple
// eBird calls, so repeated requests for the same area reuse the last list
// instead of hitting eBird again. The /api/explore route keeps its own
// request-level cache on top of this — behavior there is unchanged.
const LIST_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const LIST_CACHE_MAX_ENTRIES = 100;
const listCache = new Map();

async function buildExploreList({ lat, lng, radiusKm, backDays }) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}|r:${radiusKm}|d:${backDays}`;

  const hit = listCache.get(key);
  if (hit && Date.now() - hit.time < LIST_CACHE_TTL_MS) {
    return hit.birds;
  }

  const birds = await buildExploreListUncached({ lat, lng, radiusKm, backDays });

  if (listCache.size >= LIST_CACHE_MAX_ENTRIES) {
    listCache.delete(listCache.keys().next().value); // drop oldest
  }
  listCache.set(key, { time: Date.now(), birds });
  return birds;
}

// Builds the Explore list: up to 10 birds across four beginner-friendly
// categories, randomized so repeat visits feel fresh. Uses only the live
// eBird API (no EBD).
async function buildExploreListUncached({ lat, lng, radiusKm, backDays }) {
  const [allSpecies, notableRaw] = await Promise.all([
    fetchNearbySpecies({ lat, lng, radiusKm, backDays }),
    // Notable is a bonus category — if it fails, continue without it
    fetchNotableObservations({ lat, lng, radiusKm, backDays }).catch((err) => {
      console.error("[Explore] Notable fetch failed:", err.message);
      return [];
    }),
  ]);

  if (allSpecies.length === 0) return [];

  const chosen = new Set();
  const birds = [];

  // ── Notable picks: group eBird's notable records by species, pick randomly ──
  const notableBySpecies = new Map();
  for (const r of notableRaw) {
    if (!r.speciesCode || !isSpeciesLevel(r.comName)) continue;
    if (!notableBySpecies.has(r.speciesCode)) notableBySpecies.set(r.speciesCode, []);
    notableBySpecies.get(r.speciesCode).push(r);
  }

  for (const [code, records] of shuffle([...notableBySpecies.entries()]).slice(0, TARGETS.notable)) {
    const first = records[0];
    const locationCount = new Set(records.map((r) => r.locId).filter(Boolean)).size;
    chosen.add(code);
    birds.push({
      commonName: first.comName || "Unknown Species",
      scientificName: first.sciName || "",
      speciesCode: code,
      category: "notable",
      categoryLabel: CATEGORY_LABELS.notable,
      reason: `Flagged as notable in ${records.length} returned eBird ${records.length === 1 ? "report" : "reports"} nearby in the last ${backDays} days.`,
      mostRecentReportDate: newestReportDate(records),
      locationCount,
    });
  }

  // ── Frequency candidates: random species sample, then count each one's
  //    returned report locations using the same per-species search the
  //    normal results page uses (so card counts match "Search this bird") ──
  const pool = shuffle(
    allSpecies.filter(
      (r) => r.speciesCode && isSpeciesLevel(r.comName) && !chosen.has(r.speciesCode)
    )
  );
  const candidates = pool.slice(0, CANDIDATE_SAMPLE_SIZE);

  const counted = [];
  for (let i = 0; i < candidates.length; i += LOOKUP_BATCH_SIZE) {
    const batch = candidates.slice(i, i + LOOKUP_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (raw) => {
        try {
          const obs = await fetchRecentObservations({
            speciesCode: raw.speciesCode,
            lat,
            lng,
            radiusKm,
            backDays,
          });
          const locationCount = new Set(
            obs.map((o) => o.locationId || o.locationName).filter(Boolean)
          ).size;
          return locationCount > 0 ? { raw, obs, locationCount } : null;
        } catch (err) {
          console.error(`[Explore] Count failed for ${raw.speciesCode}:`, err.message);
          return null;
        }
      })
    );
    counted.push(...results.filter(Boolean));
  }

  const buckets = { frequent: [], occasional: [], few: [] };
  for (const c of counted) buckets[categoryFor(c.locationCount)].push(c);

  const toBird = (c) => {
    const category = categoryFor(c.locationCount);
    return {
      commonName: c.raw.comName || "Unknown Species",
      scientificName: c.raw.sciName || "",
      speciesCode: c.raw.speciesCode,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      reason: reasonFor(category, c.locationCount, backDays),
      mostRecentReportDate: newestReportDate(c.obs),
      locationCount: c.locationCount,
    };
  };

  // Primary picks per category (candidates are already in random order)
  const leftovers = [];
  for (const category of ["frequent", "occasional", "few"]) {
    const picks = buckets[category].slice(0, TARGETS[category]);
    leftovers.push(...buckets[category].slice(TARGETS[category]));
    for (const c of picks) {
      chosen.add(c.raw.speciesCode);
      birds.push(toBird(c));
    }
  }

  // Backfill from leftover candidates (keeping their true category labels)
  // so we return up to 10 birds when one category came up short.
  for (const c of shuffle(leftovers)) {
    if (birds.length >= TOTAL_BIRDS) break;
    if (chosen.has(c.raw.speciesCode)) continue;
    chosen.add(c.raw.speciesCode);
    birds.push(toBird(c));
  }

  return birds.slice(0, TOTAL_BIRDS);
}

module.exports = { buildExploreList };
