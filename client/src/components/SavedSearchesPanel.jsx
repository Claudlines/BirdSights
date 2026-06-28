const TIMEFRAME_LABELS = { 7: "Within 1 week", 14: "Within 2 weeks", 30: "Within 30 days" };

export default function SavedSearchesPanel({ searches, onRun, onDelete }) {
  return (
    <aside className="saved-searches-panel">
      <h2 className="panel-title">Saved Searches</h2>

      {searches.length === 0 ? (
        <div className="saved-searches-empty">
          <p>No saved searches yet.</p>
          <p>Run a search and save it for quick access later.</p>
        </div>
      ) : (
        <ul className="saved-searches-list">
          {searches.map((s) => (
            <li key={s.id} className="saved-search-card">
              <div className="saved-search-info">
                <div className="saved-search-name">{s.commonName}</div>
                <div className="saved-search-meta">
                  {s.location ? s.location : "Current location"} &bull; {s.radiusKm} km &bull;{" "}
                  {TIMEFRAME_LABELS[s.backDays] || `Within ${s.backDays} days`}
                </div>
              </div>
              <div className="saved-search-actions">
                <button
                  type="button"
                  className="btn-run-search"
                  onClick={() => onRun(s)}
                >
                  Run Search
                </button>
                <button
                  type="button"
                  className="btn-delete-search"
                  onClick={() => onDelete(s.id)}
                  aria-label={`Delete saved search for ${s.commonName}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="saved-searches-note">Saved searches are stored locally in this browser.</p>
    </aside>
  );
}
