import { useState, useCallback, useMemo } from "react";
import MapView from "./MapView";
import SelectedReportPanel from "./SelectedReportPanel";
import ReportList from "./ReportList";
import LegendPanel from "./LegendPanel";
import SummaryPanel from "./SummaryPanel";
import BirdImageCard from "./BirdImageCard";
import BirdActivitySummary from "./BirdActivitySummary";
import { sortItems } from "../utils/sortReports";
import { saveSearch, isSearchSaved } from "../utils/savedSearches";

const PAGE_SIZE = 10;

export default function ResultsPage({ initialData, searchParams, onBack, darkMode, onToggleDark, onSaveSearch }) {
  const [data] = useState(initialData);
  const [selectedReport, setSelectedReport] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest");
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState(() => isSearchSaved(searchParams));

  function handleSaveSearch() {
    saveSearch(searchParams);
    setSaved(true);
    onSaveSearch?.();
  }

  const rawResults = data?.results ?? [];
  const searchCenter = data?.searchCenter;
  const radiusKm = data?.radiusKm ?? searchParams?.radiusKm ?? 25;
  const backDays = data?.backDays ?? searchParams?.backDays ?? 7;

  // Sort the flat raw results; pagination is handled inside ReportList
  const sortedResults = useMemo(
    () => sortItems(rawResults, sortOrder),
    [rawResults, sortOrder]
  );

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / PAGE_SIZE));

  function handleSortOrder(order) {
    setSortOrder(order);
    setPage(1);
  }

  const handleSelectReport = useCallback((report) => {
    setSelectedReport(report);
  }, []);

  const timeframeLabel =
    backDays === 7 ? "Within 7 days" : backDays === 14 ? "Within 14 days" : "Within 30 days";

  const selectedCommonName = searchParams?.commonName || rawResults[0]?.commonName;
  const selectedSpeciesCode = searchParams?.speciesCode || rawResults[0]?.speciesCode;
  const birdName = selectedCommonName || selectedSpeciesCode || "Species";

  return (
    <div className="results-page">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="results-header">
        <button className="btn-back" onClick={onBack} aria-label="Back to search">
          ← Back
        </button>
        <span className="results-title">BirdSights</span>
        <span className="results-subtitle">
          {birdName} &bull; {radiusKm} km &bull; {timeframeLabel}
        </span>
        <button
          type="button"
          className="btn-save-search"
          onClick={handleSaveSearch}
          disabled={saved}
        >
          {saved ? "Saved" : "Save Search"}
        </button>
        <button
          className="btn-theme-toggle"
          onClick={onToggleDark}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          style={{ marginLeft: "auto" }}
        >
          {darkMode ? "☀ Light" : "🌙 Dark"}
        </button>
      </header>

      {/* ── Large-result safety notice (only when the search was capped) ── */}
      {data?.capped && data?.capNotice && (
        <p className="results-cap-notice" role="status">
          {data.capNotice}
        </p>
      )}

      {/* ── Summary metrics ───────────────────────────────────────────── */}
      <SummaryPanel data={data} searchParams={searchParams} />

      {/* ── Selected bird image ──────────────────────────────────────── */}
      <BirdImageCard commonName={selectedCommonName} speciesCode={selectedSpeciesCode} />

      {/* ── Bird activity summary ────────────────────────────────────── */}
      <BirdActivitySummary data={data} searchParams={searchParams} />

      {/* ── Sort control ──────────────────────────────────────────────── */}
      <div className="controls-bar" role="toolbar" aria-label="Sort controls">
        <div className="control-group">
          <span className="control-label">Sort</span>
          <div className="segmented-control" role="group" aria-label="Sort order">
            <button
              className={`seg-btn${sortOrder === "newest" ? " active" : ""}`}
              onClick={() => handleSortOrder("newest")}
              aria-pressed={sortOrder === "newest"}
            >
              Newest first
            </button>
            <button
              className={`seg-btn${sortOrder === "oldest" ? " active" : ""}`}
              onClick={() => handleSortOrder("oldest")}
              aria-pressed={sortOrder === "oldest"}
            >
              Oldest first
            </button>
          </div>
        </div>
      </div>

      {/* ── Map + panels ─────────────────────────────────────────────── */}
      <div className="results-main">
        <SelectedReportPanel report={selectedReport} />

        <MapView
          searchCenter={searchCenter}
          radiusKm={radiusKm}
          results={sortedResults}
          selectedId={selectedReport?.id}
          onSelectReport={handleSelectReport}
        />

        <LegendPanel />
      </div>

      {/* ── Result list + pagination ───────────────────────────────────── */}
      <ReportList
        results={sortedResults}
        selectedId={selectedReport?.id}
        onSelect={handleSelectReport}
        page={page}
        totalPages={totalPages}
        onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
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
