// Categorizes how old a returned eBird report is. This reflects returned
// report age only — it does not indicate how likely the bird is to be present.

export const FRESHNESS_LEVELS = {
  fresh: { key: "fresh", label: "Fresh report", range: "0–7 days old" },
  recent: { key: "recent", label: "Recent report", range: "8–14 days old" },
  older: { key: "older", label: "Older report", range: "15+ days old" },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getReportFreshness(observationDateTime) {
  if (!observationDateTime) return FRESHNESS_LEVELS.older;
  const t = new Date(observationDateTime.replace(" ", "T")).getTime();
  if (Number.isNaN(t)) return FRESHNESS_LEVELS.older;

  const ageDays = (Date.now() - t) / MS_PER_DAY;
  if (ageDays <= 7) return FRESHNESS_LEVELS.fresh;
  if (ageDays <= 14) return FRESHNESS_LEVELS.recent;
  return FRESHNESS_LEVELS.older;
}
