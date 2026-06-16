function parseObsDate(obs) {
  try {
    return obs.observationDateTime ? new Date(obs.observationDateTime).getTime() : 0;
  } catch {
    return 0;
  }
}

function groupReports(observations) {
  const groups = new Map();

  for (const obs of observations) {
    const key =
      obs.locationId ||
      obs.locationName ||
      `${Math.round(obs.latitude * 100) / 100}_${Math.round(obs.longitude * 100) / 100}`;

    if (!groups.has(key)) {
      groups.set(key, { representative: obs, records: [obs] });
    } else {
      const group = groups.get(key);
      group.records.push(obs);
      if (parseObsDate(obs) > parseObsDate(group.representative)) {
        group.representative = obs;
      }
    }
  }

  return Array.from(groups.values()).map(({ representative, records }) => ({
    ...representative,
    reportCountAtLocation: records.length,
    additionalReturnedReports: records.length - 1,
  }));
}

module.exports = { groupReports };
