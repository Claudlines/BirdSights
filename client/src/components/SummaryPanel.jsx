export default function SummaryPanel({ data, searchParams }) {
  const rawResults = data?.results ?? [];
  const backDays = data?.backDays ?? searchParams?.backDays ?? 7;
  const radiusKm = data?.radiusKm ?? searchParams?.radiusKm ?? 25;
  const locationLabel = data?.searchCenter?.label || searchParams?.location || "your location";
  const birdName = rawResults[0]?.commonName || searchParams?.speciesCode || "Species";

  const returnedCount = rawResults.length;

  const numericCounts = rawResults.filter((r) => typeof r.numberObserved === "number");
  const totalIndividuals = numericCounts.reduce((s, r) => s + r.numberObserved, 0);
  const someCountsMissing = numericCounts.length < rawResults.length;

  const uniqueLocations = new Set(
    rawResults.map((r) => r.locationId || r.locationName).filter(Boolean)
  ).size;

  const timeframeLabel =
    backDays === 7 ? "Within 7 days" : backDays === 14 ? "Within 14 days" : "Within 30 days";

  // Shorten very long location labels for display
  const shortLocation =
    locationLabel.length > 60 ? locationLabel.slice(0, 57) + "…" : locationLabel;

  return (
    <div className="summary-panel">
      <div className="summary-header">
        <div className="summary-bird-line">
          <strong>{birdName}</strong> near {shortLocation}
        </div>
        <div className="summary-meta-line">
          {timeframeLabel} &bull; {radiusKm} km radius
        </div>
      </div>

      <div className="summary-stats">
        <div className="summary-stat">
          <span className="summary-stat-value">{returnedCount}</span>
          <span className="summary-stat-label">Returned eBird checklists</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">
            {returnedCount === 0 ? "—" : `${totalIndividuals}${someCountsMissing ? "+" : ""}`}
          </span>
          <span className="summary-stat-label">
            Total individuals in returned records
            {someCountsMissing && returnedCount > 0 && (
              <span className="summary-note"> (some counts not reported)</span>
            )}
          </span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">{uniqueLocations}</span>
          <span className="summary-stat-label">Unique returned locations</span>
        </div>
      </div>
    </div>
  );
}
