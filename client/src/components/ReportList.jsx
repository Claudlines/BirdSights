function fmtDate(dateStr) {
  if (!dateStr) return "Unknown";
  try {
    const d = new Date(dateStr.replace(" ", "T"));
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function ReportList({ results, selectedId, onSelect }) {
  if (!results || results.length === 0) {
    return (
      <div className="report-list-section">
        <h2>Recent Report Locations</h2>
        <div className="no-results-msg">
          No recent eBird reports were found for this species within the selected radius.
          Try a larger radius or a different location.
        </div>
      </div>
    );
  }

  return (
    <div className="report-list-section">
      <h2>Recent Report Locations ({results.length})</h2>
      <div className="report-list">
        {results.map((r) => (
          <div
            key={r.id}
            className={`report-card${r.id === selectedId ? " selected" : ""}`}
            onClick={() => onSelect(r)}
            onKeyDown={(e) => e.key === "Enter" && onSelect(r)}
            tabIndex={0}
            role="button"
            aria-pressed={r.id === selectedId}
          >
            <div className="report-card-name">{r.locationName}</div>
            <div className="report-card-meta">
              Most Recent Report: {fmtDate(r.observationDateTime)}
            </div>
            <div className="report-card-meta">
              Number Observed In Latest Report:{" "}
              {r.numberObserved != null ? r.numberObserved : "Not reported"}
            </div>
            <div className="report-card-meta">
              Reports Returned At This Location: {r.reportCountAtLocation ?? 1}
              {(r.additionalReturnedReports ?? 0) > 0 &&
                ` (${r.additionalReturnedReports} additional)`}
            </div>
            <div className="report-card-meta">
              Distance: {r.distanceKm != null ? `${r.distanceKm} km` : "Unknown"}
            </div>
            {r.checklistUrl ? (
              <a
                className="report-card-link"
                href={r.checklistUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                View Latest Checklist ↗
              </a>
            ) : (
              <span style={{ fontSize: "0.8rem", color: "#9aa0a6" }}>
                Checklist unavailable
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
