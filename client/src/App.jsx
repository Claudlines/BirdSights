import { useState, useEffect } from "react";
import SearchForm from "./components/SearchForm";
import AskBirdSights from "./components/AskBirdSights";
import ResultsPage from "./components/ResultsPage";
import LoadingIndicator from "./components/LoadingIndicator";
import ErrorMessage from "./components/ErrorMessage";
import SavedSearchesPanel from "./components/SavedSearchesPanel";
import { searchBirds } from "./api/searchApi";
import { getSavedSearches, deleteSavedSearch } from "./utils/savedSearches";
import "./styles/main.css";

export default function App() {
  const [page, setPage] = useState("landing");
  const [searchParams, setSearchParams] = useState(null);
  const [searchData, setSearchData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedSearches, setSavedSearches] = useState(() => getSavedSearches());
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("bnm-theme") === "dark"
  );

  // Apply theme to <html> so all CSS dark-mode selectors work
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("bnm-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  function toggleDark() { setDarkMode((m) => !m); }

  async function handleSearch(params) {
    setError("");
    setLoading(true);
    setSearchParams(params);
    try {
      const data = await searchBirds(params);
      setSearchData(data);
      setPage("results");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setPage("landing");
    setSearchData(null);
    setError("");
    setSavedSearches(getSavedSearches());
  }

  function handleRunSavedSearch(saved) {
    handleSearch({
      speciesCode: saved.speciesCode,
      commonName: saved.commonName,
      location: saved.location || null,
      latitude: saved.latitude,
      longitude: saved.longitude,
      radiusKm: saved.radiusKm,
      backDays: saved.backDays,
    });
  }

  function handleDeleteSavedSearch(id) {
    setSavedSearches(deleteSavedSearch(id));
  }

  if (page === "results" && searchData) {
    return (
      <ResultsPage
        initialData={searchData}
        searchParams={searchParams}
        onBack={handleBack}
        darkMode={darkMode}
        onToggleDark={toggleDark}
        onSaveSearch={() => setSavedSearches(getSavedSearches())}
      />
    );
  }

  return (
    <div className="landing">
      <h1 className="landing-logo">
        BirdSights
        <img
          src="/birdsights-logo-bird-left.png"
          alt=""
          aria-hidden="true"
          className="landing-logo-img"
        />
      </h1>
      <p className="landing-tagline">Find recent bird sightings near you</p>

      <div className="landing-content">
        <div className="landing-spacer" aria-hidden="true" />

        <div className="landing-main">
          <SearchForm
            onSearch={handleSearch}
            loading={loading}
            darkMode={darkMode}
            onToggleDark={toggleDark}
            initialValues={searchParams}
          />

          {loading && (
            <div style={{ marginTop: "1.5rem" }}>
              <LoadingIndicator />
            </div>
          )}

          {error && (
            <div style={{ marginTop: "1rem", maxWidth: "560px", width: "100%" }}>
              <ErrorMessage message={error} />
            </div>
          )}

          <AskBirdSights onViewResults={handleSearch} searchLoading={loading} />
        </div>

        <SavedSearchesPanel
          searches={savedSearches}
          onRun={handleRunSavedSearch}
          onDelete={handleDeleteSavedSearch}
        />
      </div>

      <footer className="footer" style={{ marginTop: "2rem" }}>
        Powered by{" "}
        <a href="https://ebird.org" target="_blank" rel="noopener noreferrer">eBird</a>
        {" · "}
        <a href="https://openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
      </footer>
    </div>
  );
}
