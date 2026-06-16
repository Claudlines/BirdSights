import { useState, useCallback } from "react";
import MapView from "./MapView";
import SelectedReportPanel from "./SelectedReportPanel";
import ReportList from "./ReportList";
import LegendPanel from "./LegendPanel";
import ErrorMessage from "./ErrorMessage";
import { searchBirds } from "../api/searchApi";

export default function ResultsPage({ initialData, searchParams, onBack }) {
  const [data, setData] = useState(initialData);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const results = data?.results ?? [];
  const searchCenter = data?.searchCenter;
  const radiusKm = data?.radiusKm ?? searchParams?.radiusKm ?? 25;

  async function handleToggleShowAll(checked) {
    setShowAll(checked);
    setError("");
    setLoading(true);
    setSelectedReport(null);
    try {
      const fresh = await searchBirds({ ...searchParams, showAllReports: checked });
      setData(fresh);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectReport = useCallback((report) => {
    setSelectedReport(report);
  }, []);

  const birdName = results[0]?.commonName || searchParams?.speciesCode || "Species";
  const locationLabel = searchCenter?.label || "your location";

  return (
    <div className="results-page">
      <header className="results-header">
        <button className="btn-back" onClick={onBack} aria-label="Back to search">
          ← Back
        </button>
        <span className="results-title">BirdsNearMe</span>
        <span className="results-subtitle">
          {birdName} · {radiusKm} km radius · {locationLabel}
        </span>
      </header>

      <div className="toggle-row">
        <input
          id="show-all-toggle"
          type="checkbox"
          checked={showAll}
          onChange={(e) => handleToggleShowAll(e.target.checked)}
          disabled={loading}
        />
        <label htmlFor="show-all-toggle">Show All Individual Reports</label>
        {loading && <span style={{ color: "#9aa0a6", marginLeft: "0.5rem" }}>Updating…</span>}
      </div>

      {error && (
        <div style={{ padding: "0.5rem 1rem" }}>
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="results-main">
        <SelectedReportPanel report={selectedReport} />

        <MapView
          searchCenter={searchCenter}
          radiusKm={radiusKm}
          results={results}
          selectedId={selectedReport?.id}
          onSelectReport={handleSelectReport}
        />

        <LegendPanel />
      </div>

      <ReportList
        results={results}
        selectedId={selectedReport?.id}
        onSelect={handleSelectReport}
      />

      <footer className="footer">
        Powered by{" "}
        <a href="https://ebird.org" target="_blank" rel="noopener noreferrer">eBird</a>
        {" · "}
        <a href="https://openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
      </footer>
    </div>
  );
}
