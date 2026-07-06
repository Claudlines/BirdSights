const PAGE_SIZE = 10;

function fmtDate(dateStr) {
  if (!dateStr) return "Unknown";
  try {
    return new Date(dateStr.replace(" ", "T")).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function ReportList({
  results,      // full sorted list (all pages)
  selectedId,
  onSelect,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
}) {
  const isEmpty = !results || results.length === 0;
  const pageItems = results ? results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];

  return (
    <div className="report-list-section">
      <div className="report-list-header">
        <h2>Recent eBird Sighting Locations</h2>
        {!isEmpty && totalPages > 1 && (
          <span className="page-info">Page {page} of {totalPages}</span>
        )}
      </div>
      <p className="report-list-note">
        Each result is the most recent eBird report of this bird at a nearby sighting location
        within the selected timeframe.
      </p>

      {isEmpty ? (
        <div className="no-results-msg">
          No recent eBird sightings were found for this species within the selected radius and
          timeframe. Try a larger radius, longer timeframe, or different location.
        </div>
      ) : (
        <>
          <div className="report-list">
            {pageItems.map((r) => (
              <SightingCard key={r.id} r={r} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-page"
                onClick={onPrevPage}
                disabled={page === 1}
                aria-label="Previous page"
              >
                ← Previous
              </button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button
                className="btn-page"
                onClick={onNextPage}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SightingCard({ r, selectedId, onSelect }) {
  return (
    <div
      className={`report-card${r.id === selectedId ? " selected" : ""}`}
      onClick={() => onSelect(r)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(r)}
      tabIndex={0}
      role="button"
      aria-pressed={r.id === selectedId}
    >
      <div className="report-card-name">{r.locationName}</div>
      <div className="report-card-meta">
        Latest checklist: {fmtDate(r.observationDateTime)}
      </div>
      <div className="report-card-meta">
        Birds reported in this returned checklist:{" "}
        {r.numberObserved != null ? r.numberObserved : "Not reported"}
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
          View checklist ↗
        </a>
      ) : (
        <span className="report-card-meta">Checklist unavailable</span>
      )}
    </div>
  );
}
