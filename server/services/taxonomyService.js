const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

let taxonomyCache = null;
let loadPromise = null;

async function loadTaxonomy() {
  if (taxonomyCache) return taxonomyCache;

  // Deduplicate concurrent requests — return the in-flight promise
  if (loadPromise) return loadPromise;

  loadPromise = _fetchTaxonomy()
    .then((data) => {
      taxonomyCache = data;
      loadPromise = null;
      return data;
    })
    .catch((err) => {
      loadPromise = null; // allow retry on next request
      throw err;
    });

  return loadPromise;
}

async function _fetchTaxonomy() {
  const apiKey = process.env.EBIRD_API_KEY;
  if (!apiKey || apiKey === "your_ebird_api_key_here") {
    throw new Error("EBIRD_API_KEY not configured — taxonomy unavailable.");
  }

  const params = new URLSearchParams({ fmt: "json", locale: "en" });
  const url = `https://api.ebird.org/v2/ref/taxonomy/ebird?${params.toString()}`;

  let response;
  try {
    response = await fetch(url, {
      headers: { "x-ebirdapitoken": apiKey },
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    console.error("[Taxonomy] Network error:", err.message);
    throw new Error("Could not reach eBird to load taxonomy.");
  }

  if (!response.ok) {
    console.error("[Taxonomy] HTTP error:", response.status);
    throw new Error(`eBird taxonomy fetch failed with status ${response.status}.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("eBird taxonomy response was not valid JSON.");
  }

  if (!Array.isArray(data)) {
    throw new Error("eBird taxonomy response had an unexpected shape.");
  }

  console.log(`[Taxonomy] Loaded ${data.length} total records from eBird.`);

  // Keep species-level records only to exclude hybrids, slashes, spuhs, etc.
  const species = data
    .filter((item) => item.category === "species")
    .map((item) => ({
      commonName: item.comName || "",
      scientificName: item.sciName || "",
      speciesCode: item.speciesCode || "",
    }));

  console.log(`[Taxonomy] Retained ${species.length} species-level records.`);
  return species;
}

function searchTaxonomy(taxonomy, query) {
  const q = query.toLowerCase();

  const matches = taxonomy.filter(
    (b) =>
      b.commonName.toLowerCase().includes(q) ||
      b.scientificName.toLowerCase().includes(q) ||
      b.speciesCode.toLowerCase().includes(q)
  );

  // Boost records whose common name starts with the query to the top
  matches.sort((a, b) => {
    const aStarts = a.commonName.toLowerCase().startsWith(q);
    const bStarts = b.commonName.toLowerCase().startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.commonName.localeCompare(b.commonName);
  });

  return matches.slice(0, 20);
}

// Resolves a free-text bird name (e.g. from Ask BirdSights) to a single
// species record. Prefers an exact common-name match, then the top search hit.
function findBestSpeciesMatch(taxonomy, name) {
  const q = (name || "").trim().toLowerCase();
  if (q.length < 2) return null;

  const exact = taxonomy.find((b) => b.commonName.toLowerCase() === q);
  if (exact) return exact;

  const matches = searchTaxonomy(taxonomy, q);
  return matches[0] || null;
}

module.exports = { loadTaxonomy, searchTaxonomy, findBestSpeciesMatch };
