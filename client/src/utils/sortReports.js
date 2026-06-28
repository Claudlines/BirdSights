function parseDateStr(dateStr) {
  if (!dateStr) return 0;
  try { return new Date(dateStr.replace(" ", "T")).getTime(); } catch { return 0; }
}

export function sortItems(items, direction = "newest") {
  return [...items].sort((a, b) => {
    const ta = parseDateStr(a.observationDateTime);
    const tb = parseDateStr(b.observationDateTime);
    const diff = direction === "newest" ? tb - ta : ta - tb;
    if (diff !== 0) return diff;
    // Secondary sort by distance for ties
    return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  });
}
