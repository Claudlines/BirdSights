function parseDateStr(dateStr) {
  if (!dateStr) return 0;
  try { return new Date(dateStr.replace(" ", "T")).getTime(); } catch { return 0; }
}

export function groupReports(observations) {
  const groups = new Map();

  for (const obs of observations) {
    // Use locId when available; otherwise combine name + rounded coords to avoid
    // merging two different locations that share the same display name.
    const key = obs.locationId
      ? obs.locationId
      : `${obs.locationName || "unknown"}_${Math.round((obs.latitude ?? 0) * 100) / 100}_${Math.round((obs.longitude ?? 0) * 100) / 100}`;

    if (!groups.has(key)) {
      groups.set(key, { representative: obs, records: [obs] });
    } else {
      const group = groups.get(key);
      group.records.push(obs);
      if (parseDateStr(obs.observationDateTime) > parseDateStr(group.representative.observationDateTime)) {
        group.representative = obs;
      }
    }
  }

  return Array.from(groups.values()).map(({ representative, records }) => {
    const totalIndividuals = records.reduce(
      (sum, r) => sum + (typeof r.numberObserved === "number" ? r.numberObserved : 0),
      0
    );
    const hasUnknownCounts = records.some((r) => r.numberObserved == null);

    let oldestTime = Infinity;
    let oldestDateTime = null;
    for (const r of records) {
      const t = parseDateStr(r.observationDateTime);
      if (t > 0 && t < oldestTime) { oldestTime = t; oldestDateTime = r.observationDateTime; }
    }

    return {
      ...representative,
      reportCountAtLocation: records.length,
      additionalReturnedReports: records.length - 1,
      totalIndividualsAtLocation: totalIndividuals,
      hasUnknownCountsAtLocation: hasUnknownCounts,
      oldestObservationDateTime: oldestDateTime,
    };
  });
}
