import { useState } from "react";
import BirdAutocomplete from "./BirdAutocomplete";
import ErrorMessage from "./ErrorMessage";

const RADIUS_OPTIONS = [5, 10, 25, 50];
const TIMEFRAME_OPTIONS = [
  { label: "Within 1 week",  value: 7 },
  { label: "Within 2 weeks", value: 14 },
  { label: "Within 30 days", value: 30 },
];

export default function SearchForm({ onSearch, loading, darkMode, onToggleDark }) {
  const [birdText, setBirdText] = useState("");
  const [selectedBird, setSelectedBird] = useState(null);
  const [location, setLocation] = useState("");
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [backDays, setBackDays] = useState(7);
  const [birdError, setBirdError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [gpsError, setGpsError] = useState("");

  function handleBirdSelect(bird) {
    setSelectedBird(bird);
    setBirdText(bird.commonName);
    setBirdError("");
  }

  function handleBirdChange(text) {
    setBirdText(text);
    if (selectedBird && text !== selectedBird.commonName) setSelectedBird(null);
    setBirdError("");
  }

  function handleLocationChange(e) {
    setLocation(e.target.value);
    setGpsCoords(null);
    setLocationError("");
    setGpsError("");
  }

  function handleGps() {
    if (!navigator.geolocation) {
      setGpsError("Your browser does not support location access.");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    setLocation("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocation("");
        setGpsLoading(false);
        setLocationError("");
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.TIMEOUT) {
          setGpsError("Location request timed out. Please try again or enter a location manually.");
        } else {
          setGpsError("We could not access your current location. You can still type a location manually.");
        }
      },
      { timeout: 10000 }
    );
  }

  function validate() {
    let ok = true;
    if (!selectedBird) {
      setBirdError("Please select a bird from the suggestions before searching.");
      ok = false;
    }
    if (!gpsCoords && !location.trim()) {
      setLocationError("Please enter a location or use your current location.");
      ok = false;
    }
    return ok;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSearch({
      speciesCode: selectedBird.speciesCode,
      commonName: selectedBird.commonName,
      location: gpsCoords ? null : location.trim(),
      latitude: gpsCoords?.lat ?? null,
      longitude: gpsCoords?.lng ?? null,
      radiusKm,
      backDays,
    });
  }

  return (
    <form className="search-card" onSubmit={handleSubmit} noValidate>
      {/* Theme toggle inside card top-right */}
      {onToggleDark && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
          <button
            type="button"
            className="btn-theme-toggle"
            onClick={onToggleDark}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? "☀ Light" : "🌙 Dark"}
          </button>
        </div>
      )}

      <BirdAutocomplete
        value={birdText}
        onChange={handleBirdChange}
        onSelect={handleBirdSelect}
        error={birdError}
      />

      <div className="form-group">
        <label htmlFor="location-input">Location</label>
        <input
          id="location-input"
          type="text"
          className="form-input"
          placeholder="e.g. Philadelphia, PA or 19121"
          value={location}
          onChange={handleLocationChange}
          disabled={!!gpsCoords}
          aria-describedby={locationError ? "location-error" : undefined}
        />
        {locationError && (
          <div id="location-error" className="error-msg" role="alert">{locationError}</div>
        )}
      </div>

      <button
        type="button"
        className="btn-gps"
        onClick={handleGps}
        disabled={gpsLoading || loading}
        aria-label="Use my current location"
      >
        {gpsLoading ? "Detecting location…" : "📍 Use My Current Location"}
      </button>

      {gpsCoords && (
        <div className="gps-indicator" aria-live="polite">
          ✓ Current location detected
          <button
            type="button"
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#c5221f", cursor: "pointer", fontSize: "0.82rem" }}
            onClick={() => { setGpsCoords(null); setGpsError(""); }}
          >
            Clear
          </button>
        </div>
      )}
      {gpsError && <ErrorMessage message={gpsError} />}

      <div className="form-row-2">
        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label htmlFor="radius-select">Radius</label>
          <select
            id="radius-select"
            className="form-select"
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>{r} km</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label htmlFor="timeframe-select">Timeframe</label>
          <select
            id="timeframe-select"
            className="form-select"
            value={backDays}
            onChange={(e) => setBackDays(Number(e.target.value))}
          >
            {TIMEFRAME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Searching…" : "Find Recent Reports"}
      </button>
    </form>
  );
}
