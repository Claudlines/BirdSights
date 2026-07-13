import { useState } from "react";
import { exploreBirds } from "../api/exploreApi";
import { getBirdImage } from "../utils/birdImages";

const RADIUS_OPTIONS = [5, 10, 25, 50];
const TIMEFRAME_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 14 days", value: 14 },
  { label: "Last 30 days", value: 30 },
];

export default function ExploreBirdsNearYou({ onSearchBird, searchLoading }) {
  const [location, setLocation] = useState("");
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [backDays, setBackDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  // The location/radius/timeframe used for the current results, so
  // "Search this bird" reruns the exact same area and window.
  const [usedParams, setUsedParams] = useState(null);

  function handleGps() {
    if (!navigator.geolocation) {
      setError("Your browser does not support location access. Please type a location instead.");
      return;
    }
    setGpsLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocation("");
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.TIMEOUT) {
          setError("Location request timed out. Please try again or type a location.");
        } else {
          setError("We could not access your current location. You can still type a location.");
        }
      },
      { timeout: 10000 }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    if (!gpsCoords && !location.trim()) {
      setError("Please enter a location or use your current location.");
      return;
    }

    const params = {
      location: gpsCoords ? null : location.trim(),
      latitude: gpsCoords?.lat ?? null,
      longitude: gpsCoords?.lng ?? null,
      radiusKm,
      backDays,
    };

    setLoading(true);
    setError("");
    setData(null);
    try {
      const result = await exploreBirds(params);
      setData(result);
      setUsedParams(params);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchBird(bird) {
    if (!usedParams) return;
    onSearchBird({
      speciesCode: bird.speciesCode,
      commonName: bird.commonName,
      location: usedParams.location,
      latitude: usedParams.latitude,
      longitude: usedParams.longitude,
      radiusKm: usedParams.radiusKm,
      backDays: usedParams.backDays,
    });
  }

  return (
    <div className="explore-card">
      <div className="explore-card-header">
        <span className="explore-card-title">Explore Birds Near You</span>
        <span className="explore-card-subtitle">
          Not sure what bird to search for? Enter your location to discover birds recently
          reported near you.
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <label htmlFor="explore-location" className="sr-only">
          Location for exploring nearby birds
        </label>
        <div className="explore-form-row">
          <input
            id="explore-location"
            type="text"
            className="form-input"
            placeholder="e.g. Philadelphia, PA or 19153"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setGpsCoords(null);
              setError("");
            }}
            disabled={loading || !!gpsCoords}
          />
          <button
            type="button"
            className="btn-explore-gps"
            onClick={handleGps}
            disabled={gpsLoading || loading}
            aria-label="Use my current location"
            title="Use my current location"
          >
            {gpsLoading ? "…" : "📍"}
          </button>
        </div>

        {gpsCoords && (
          <div className="gps-indicator" aria-live="polite">
            ✓ Current location detected
            <button
              type="button"
              style={{ marginLeft: "auto", background: "none", border: "none", color: "#c5221f", cursor: "pointer", fontSize: "0.82rem" }}
              onClick={() => setGpsCoords(null)}
            >
              Clear
            </button>
          </div>
        )}

        <div className="explore-controls">
          <label htmlFor="explore-radius" className="sr-only">Search radius</label>
          <select
            id="explore-radius"
            className="form-select"
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            disabled={loading}
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>{r} km</option>
            ))}
          </select>

          <label htmlFor="explore-timeframe" className="sr-only">Timeframe</label>
          <select
            id="explore-timeframe"
            className="form-select"
            value={backDays}
            onChange={(e) => setBackDays(Number(e.target.value))}
            disabled={loading}
          >
            {TIMEFRAME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button type="submit" className="btn-explore" disabled={loading}>
            {loading ? "Exploring…" : "Show birds near me"}
          </button>
        </div>
      </form>

      {loading && (
        <p className="explore-status" role="status">
          Looking up birds recently reported nearby…
        </p>
      )}

      {error && (
        <div className="explore-error" role="alert">
          {error}
        </div>
      )}

      {data && data.birds.length === 0 && (
        <div className="explore-empty">{data.message}</div>
      )}

      {data && data.birds.length > 0 && (
        <>
          <div className="explore-grid">
            {data.birds.map((bird) => (
              <ExploreBirdCard
                key={bird.speciesCode}
                bird={bird}
                onSearch={() => handleSearchBird(bird)}
                searchLoading={searchLoading}
              />
            ))}
          </div>
          <p className="explore-disclaimer">
            These birds were recently reported near the selected location. Categories are based
            on recent returned eBird data and do not guarantee the bird is currently present.
          </p>
        </>
      )}
    </div>
  );
}

function ExploreBirdCard({ bird, onSearch, searchLoading }) {
  const imageSrc = getBirdImage({
    commonName: bird.commonName,
    speciesCode: bird.speciesCode,
  });

  return (
    <div className="explore-bird-card">
      {imageSrc ? (
        <img
          className="explore-bird-img"
          src={imageSrc}
          alt={`${bird.commonName} bird image`}
          loading="lazy"
        />
      ) : (
        <div className="explore-bird-img explore-bird-img-placeholder" aria-hidden="true">
          <span>Image pending</span>
        </div>
      )}

      <span className={`explore-category-badge explore-cat-${bird.category}`}>
        {bird.categoryLabel}
      </span>
      <span className="explore-bird-name">{bird.commonName}</span>
      {bird.scientificName && (
        <span className="explore-bird-sci">{bird.scientificName}</span>
      )}
      <p className="explore-bird-reason">{bird.reason}</p>
      {bird.mostRecentReportDate && (
        <p className="explore-bird-date">
          Most recent returned report: {bird.mostRecentReportDate}
        </p>
      )}
      <button
        type="button"
        className="btn-explore-search"
        onClick={onSearch}
        disabled={searchLoading}
      >
        {searchLoading ? "Loading…" : "Search this bird"}
      </button>
    </div>
  );
}
