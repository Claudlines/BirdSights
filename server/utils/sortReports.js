function parseDate(obs) {
  try {
    return obs.observationDateTime ? new Date(obs.observationDateTime).getTime() : 0;
  } catch {
    return 0;
  }
}

function sortReports(observations) {
  return [...observations].sort((a, b) => {
    const dateDiff = parseDate(b) - parseDate(a);
    if (dateDiff !== 0) return dateDiff;
    const distA = a.distanceKm ?? Infinity;
    const distB = b.distanceKm ?? Infinity;
    return distA - distB;
  });
}

module.exports = { sortReports };
