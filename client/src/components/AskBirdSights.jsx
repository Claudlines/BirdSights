import { useState } from "react";
import { askBirdSights, rerunAskSearch } from "../api/askApi";
import { getBirdImage } from "../utils/birdImages";

const MAX_QUESTION_LENGTH = 300;

const SUGGESTIONS = [
  "Have any American Woodcocks been reported near my location?",
  "Have there been any Barn Owls in ZIP code 10468 recently?",
  "I don't know any birds. What birds are reported near me?",
];

// Questions like "near me" or "in my location" need the browser's current location
const NEAR_ME_PATTERN =
  /\b(near me|my current location|current location|around me|nearby|(?:in|at|around|near)?\s*my (?:location|area))\b/i;

export default function AskBirdSights({ onViewResults, searchLoading }) {
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [coords, setCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");

  async function submitQuestion(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Attach coordinates only when the question asks about the user's
    // own surroundings and we already have permission-granted coords.
    const sendCoords = NEAR_ME_PATTERN.test(trimmed) ? coords : null;

    setLastQuestion(trimmed);
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const data = await askBirdSights(trimmed, sendCoords);
      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    submitQuestion(question);
  }

  function handleSuggestion(text) {
    setQuestion(text);
    submitQuestion(text);
  }

  // Shown when the backend asks for a location: get browser coordinates,
  // then re-ask the same question with them attached.
  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setError("Your browser does not support location access. Please type a location instead.");
      return;
    }
    setGpsLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCoords(c);
        setGpsLoading(false);
        const q = lastQuestion || question;
        if (q.trim()) {
          // Force coords along even if the question didn't say "near me" —
          // the user explicitly chose their current location.
          resubmitWithCoords(q, c);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.TIMEOUT) {
          setError("Location request timed out. Please try again or type a location.");
        } else {
          setError("We could not access your current location. You can still type a location in your question.");
        }
      },
      { timeout: 10000 }
    );
  }

  async function resubmitWithCoords(text, c) {
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const data = await askBirdSights(text.trim(), c);
      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Quick action: rerun the same interpreted bird/location with a changed
  // radius or timeframe (no new question interpretation needed).
  async function handleQuickAction(changes) {
    const p = response?.interpreted;
    if (!p || loading) return;

    setLoading(true);
    setError("");
    try {
      const data = await rerunAskSearch({
        birdName: p.commonName,
        location: p.location,
        latitude: p.latitude,
        longitude: p.longitude,
        radiusKm: changes.radiusKm ?? p.radiusKm,
        daysBack: changes.daysBack ?? p.backDays,
      });
      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleViewResults() {
    if (!response?.interpreted) return;
    const p = response.interpreted;
    onViewResults({
      speciesCode: p.speciesCode,
      commonName: p.commonName,
      location: p.location,
      latitude: p.latitude,
      longitude: p.longitude,
      radiusKm: p.radiusKm,
      backDays: p.backDays,
    });
  }

  // "Search this bird" from an explore-style answer: run the normal search
  // for that species with the same interpreted location, radius, and timeframe.
  function handleSearchExploreBird(bird) {
    const p = response?.interpreted;
    if (!p) return;
    onViewResults({
      speciesCode: bird.speciesCode,
      commonName: bird.commonName,
      location: p.location,
      latitude: p.latitude,
      longitude: p.longitude,
      radiusKm: p.radiusKm,
      backDays: p.backDays,
    });
  }

  const summary = response?.summary;
  const interpreted = response?.interpreted;

  // Local image for the interpreted bird on species answers (same helper the
  // Explore cards use); null when the response has no specific bird.
  const speciesImage = interpreted?.commonName
    ? getBirdImage({
        commonName: interpreted.commonName,
        speciesCode: interpreted.speciesCode,
      })
    : null;

  return (
    <div className="ask-card">
      <div className="ask-card-header">
        <span className="ask-card-title">Ask BirdSights</span>
        <span className="ask-card-subtitle">Optional: ask a question in plain English</span>
      </div>

      <form className="ask-form" onSubmit={handleSubmit}>
        <label htmlFor="ask-input" className="sr-only">
          Ask BirdSights a question
        </label>
        <input
          id="ask-input"
          type="text"
          className="form-input"
          placeholder="Ask: Has Cedar Waxwing been reported near Philadelphia recently?"
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            setError("");
          }}
          maxLength={MAX_QUESTION_LENGTH}
          disabled={loading}
        />
        <button
          type="submit"
          className="btn-ask"
          disabled={loading || !question.trim()}
        >
          {loading ? "Asking…" : "Ask"}
        </button>
      </form>

      <div className="ask-suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="ask-chip"
            onClick={() => handleSuggestion(s)}
            disabled={loading}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && (
        <p className="ask-status" role="status">
          Checking recent eBird reports…
        </p>
      )}

      {error && (
        <div className="ask-answer ask-answer-error" role="alert">
          {error}
        </div>
      )}

      {response?.needsClarification && (
        <div className="ask-answer ask-answer-clarify">
          {response.clarifyingQuestion}
          {response.needsCurrentLocation && (
            <div className="ask-actions">
              <button
                type="button"
                className="btn-ask-action"
                onClick={handleUseMyLocation}
                disabled={loading || gpsLoading}
              >
                {gpsLoading ? "Detecting location…" : "📍 Use my current location"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── explain_feature answer: plain explanation, no search data ── */}
      {response?.responseType === "explanation" && response.answer && (
        <div className="ask-answer">
          <p className="ask-answer-text">{response.answer}</p>
        </div>
      )}

      {/* ── explore_location answer: suggested birds with categories ── */}
      {response?.responseType === "explore" && !response.needsClarification && (
        <div className="ask-answer">
          <p className="ask-answer-text">{response.answer}</p>

          {response.birds?.length > 0 && (
            <div className="ask-explore-list">
              {response.birds.map((bird) => {
                const imageSrc = getBirdImage({
                  commonName: bird.commonName,
                  speciesCode: bird.speciesCode,
                });
                return (
                  <div className="ask-explore-item" key={bird.speciesCode}>
                    <div className="ask-explore-item-main">
                      {imageSrc ? (
                        <img
                          className="ask-explore-item-img"
                          src={imageSrc}
                          alt={`${bird.commonName} bird image`}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="ask-explore-item-img ask-explore-item-img-placeholder"
                          aria-hidden="true"
                        >
                          <span>Pending</span>
                        </div>
                      )}
                      <div className="ask-explore-item-info">
                        <span className={`explore-category-badge explore-cat-${bird.category}`}>
                          {bird.categoryLabel}
                        </span>
                        <span className="ask-explore-item-name">{bird.commonName}</span>
                        <span className="ask-explore-item-meta">
                          {bird.reason}
                          {bird.mostRecentReportDate
                            ? ` Most recent returned report: ${bird.mostRecentReportDate}.`
                            : ""}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-ask-action"
                      onClick={() => handleSearchExploreBird(bird)}
                      disabled={searchLoading}
                    >
                      Search this bird
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {response.limitationNote && (
            <p className="ask-limitation">{response.limitationNote}</p>
          )}
        </div>
      )}

      {/* ── species_search answer: the structured bird activity card ── */}
      {response && !response.needsClarification && response.answer &&
        (!response.responseType || response.responseType === "species") && (
        <div className="ask-answer">
          {interpreted?.commonName && (
            <div className="ask-species-header">
              {speciesImage ? (
                <img
                  className="ask-explore-item-img"
                  src={speciesImage}
                  alt={`${interpreted.commonName} bird image`}
                  loading="lazy"
                />
              ) : (
                <div
                  className="ask-explore-item-img ask-explore-item-img-placeholder"
                  aria-hidden="true"
                >
                  <span>Pending</span>
                </div>
              )}
              <span className="ask-species-name">{interpreted.commonName}</span>
            </div>
          )}

          <p className="ask-answer-text">{response.answer}</p>

          {summary && (
            <div className="ask-answer-details">
              <div className="ask-stat-row">
                <span className="ask-stat-label">Nearby sighting locations</span>
                <span className="ask-stat-value">{summary.nearbySightingLocationCount}</span>
              </div>
              <div className="ask-stat-row">
                <span className="ask-stat-label">Most recent returned report</span>
                <span className="ask-stat-value">
                  {summary.mostRecentReportDate ?? "None in selected timeframe"}
                </span>
              </div>
              <div className="ask-stat-row">
                <span className="ask-stat-label">Closest returned report</span>
                <span className="ask-stat-value">
                  {summary.closestReport
                    ? `${summary.closestReport.distanceKm} km — ${summary.closestReport.displayName}`
                    : "None in selected timeframe"}
                </span>
              </div>
            </div>
          )}

          {summary?.topLocations?.length > 0 && (
            <div className="ask-top-locations">
              <p className="ask-top-title">Top returned locations</p>
              <ol className="ask-top-list">
                {summary.topLocations.map((loc) => (
                  <li key={`${loc.locationName}-${loc.distanceKm}`}>
                    {loc.displayName}
                    <span className="ask-top-meta">
                      {loc.distanceKm != null ? ` — ${loc.distanceKm} km` : ""}
                      {loc.observationDate ? ` — ${loc.observationDate}` : ""}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {response.limitationNote && (
            <p className="ask-limitation">{response.limitationNote}</p>
          )}

          {interpreted && (
            <div className="ask-actions">
              <button
                type="button"
                className="btn-view-results"
                onClick={handleViewResults}
                disabled={searchLoading}
              >
                {searchLoading ? "Loading map…" : "View map results"}
              </button>
              {interpreted.radiusKm !== 50 && (
                <button
                  type="button"
                  className="btn-ask-action"
                  onClick={() => handleQuickAction({ radiusKm: 50 })}
                  disabled={loading}
                >
                  Try 50 km
                </button>
              )}
              {interpreted.backDays !== 7 && (
                <button
                  type="button"
                  className="btn-ask-action"
                  onClick={() => handleQuickAction({ daysBack: 7 })}
                  disabled={loading}
                >
                  Try last 7 days
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <p className="ask-disclaimer">
        Ask BirdSights uses AI to interpret your question, then searches recent eBird data.
        Please verify important details with the linked eBird checklist.
      </p>
    </div>
  );
}
