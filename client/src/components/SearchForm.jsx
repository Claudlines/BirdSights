import { useState } from "react";
import BirdAutocomplete from "./BirdAutocomplete";
import ErrorMessage from "./ErrorMessage";

const RADIUS_OPTIONS = [5, 10, 25, 50];

export default function SearchForm({ onSearch, loading }) {
  const [birdText, setBirdText] = useState("");
  const [selectedBird, setSelectedBird] = useState(null);
  const [location, setLocation] = useState("");
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [birdError, setBirdError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [gpsError, setGpsError] = useState("");
  const [formError, setFormError] = useState("");

  function handleBirdSelect(bird) {
    setSelectedBird(bird);
    setBirdText(bird.commonName);
    setBirdError("");
  }

  function handleBirdChange(text) {
    setBirdText(text);
    if (selectedBird && text !== selectedBird.commonName) {
      setSelectedBird(null);
    }
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
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("We could not access your current location. You can still type a location manually.");
        } else if (err.code === err.TIMEOUT) {
          setGpsError("Location request timed out. Please try again or enter a location manually.");
        } else {
          setGpsError("We could not access your current location. You can still type a location manually.");
        }
      },
      { timeout: 10000 }
    );
  }

  function validate() {
    let valid = true;
    if (!selectedBird) {
      setBirdError("Please select a bird from the suggestions before searching.");
      valid = false;
    }
    if (!gpsCoords && !location.trim()) {
      setLocationError("Please enter a location or use your current location.");
      valid = false;
    }
    return valid;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    onSearch({
      speciesCode: selectedBird.speciesCode,
      location: gpsCoords ? null : location.trim(),
      latitude: gpsCoords?.lat ?? null,
      longitude: gpsCoords?.lng ?? null,
      radiusKm,
    });
  }

  return (
    <form className="search-card" onSubmit={handleSubmit} noValidate>
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
          placeholder="e.g. Philadelphia, PA or 19146"
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

      <div className="form-group" style={{ marginTop: "1rem" }}>
        <label htmlFor="radius-select">Search Radius</label>
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

      {formError && <ErrorMessage message={formError} />}

      <button
        type="submit"
        className="btn-primary"
        disabled={loading}
      >
        {loading ? "Searching…" : "Find Recent Reports"}
      </button>
    </form>
  );
}
