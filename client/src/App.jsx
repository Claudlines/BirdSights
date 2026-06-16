import { useState } from "react";
import SearchForm from "./components/SearchForm";
import ResultsPage from "./components/ResultsPage";
import LoadingIndicator from "./components/LoadingIndicator";
import ErrorMessage from "./components/ErrorMessage";
import { searchBirds } from "./api/searchApi";
import "./styles/main.css";

export default function App() {
  const [page, setPage] = useState("landing"); // "landing" | "results"
  const [searchParams, setSearchParams] = useState(null);
  const [searchData, setSearchData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      />
    );
  }

  return (
    <div className="landing">
      <h1 className="landing-logo">BirdsNearMe</h1>
      <p className="landing-tagline">Find recent eBird reports near you</p>

      <SearchForm onSearch={handleSearch} loading={loading} />

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
