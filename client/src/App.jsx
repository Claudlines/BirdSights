import { useState, useEffect } from "react";
import SearchForm from "./components/SearchForm";
import ResultsPage from "./components/ResultsPage";
import LoadingIndicator from "./components/LoadingIndicator";
import ErrorMessage from "./components/ErrorMessage";
import { searchBirds } from "./api/searchApi";
import "./styles/main.css";

export default function App() {
  const [page, setPage] = useState("landing");
  const [searchParams, setSearchParams] = useState(null);
  const [searchData, setSearchData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
  }

  if (page === "results" && searchData) {
    return (
      <ResultsPage
        initialData={searchData}
        searchParams={searchParams}
        onBack={handleBack}
        darkMode={darkMode}
        onToggleDark={toggleDark}
      />
    );
  }

  return (
    <div className="landing">
      <h1 className="landing-logo">BirdSights</h1>
      <p className="landing-tagline">Find recent bird sightings near you</p>

      <SearchForm
        onSearch={handleSearch}
        loading={loading}
        darkMode={darkMode}
        onToggleDark={toggleDark}
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

      <footer className="footer" style={{ marginTop: "2rem" }}>
        Powered by{" "}
        <a href="https://ebird.org" target="_blank" rel="noopener noreferrer">eBird</a>
        {" · "}
        <a href="https://openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
      </footer>
    </div>
  );
}
