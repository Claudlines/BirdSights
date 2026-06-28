const STORAGE_KEY = "birdsights-saved-searches";
const MAX_SAVED = 10;

function buildKey(params) {
  return [
    params?.speciesCode ?? "",
    (params?.location ?? "").trim().toLowerCase(),
    params?.radiusKm ?? "",
    params?.backDays ?? "",
  ].join("|");
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getSavedSearches() {
  return readAll().sort((a, b) => b.savedAt - a.savedAt);
}

export function isSearchSaved(params) {
  const key = buildKey(params);
  return readAll().some((s) => s.key === key);
}

export function saveSearch(params) {
  const key = buildKey(params);
  const list = readAll().filter((s) => s.key !== key);

  const entry = {
    id: key,
    key,
    commonName: params.commonName,
    speciesCode: params.speciesCode,
    location: params.location ?? "",
    latitude: params.latitude ?? null,
    longitude: params.longitude ?? null,
    radiusKm: params.radiusKm,
    backDays: params.backDays,
    savedAt: Date.now(),
  };

  list.unshift(entry);
  const trimmed = list.slice(0, MAX_SAVED);
  writeAll(trimmed);
  return trimmed;
}

export function deleteSavedSearch(id) {
  const list = readAll().filter((s) => s.id !== id);
  writeAll(list);
  return list;
}
