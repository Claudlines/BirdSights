import { useState, useRef, useEffect } from "react";
import SUPPORTED_BIRDS from "../data/supportedBirds";
import { getBirdImage } from "../utils/birdImages";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function localFallback(query) {
  const q = query.toLowerCase();
  return SUPPORTED_BIRDS.filter(
    (b) =>
      b.commonName.toLowerCase().includes(q) ||
      b.scientificName.toLowerCase().includes(q)
  );
}

export default function BirdAutocomplete({ value, onChange, onSelect, error }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [usingFallback, setUsingFallback] = useState(false);
  const wrapperRef = useRef(null);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch from backend; fall back to local list on any error
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = value.trim();

    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setUsingFallback(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `${API_BASE}/api/species?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );

        if (!res.ok) throw new Error("Backend species search failed");

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setSuggestions(data);
          setUsingFallback(false);
        } else if (Array.isArray(data) && data.length === 0) {
          // Backend returned empty — also try local list so user isn't left with nothing
          const local = localFallback(trimmed);
          setSuggestions(local);
          setUsingFallback(local.length > 0);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        // Network error or backend down — fall back silently to local list
        const local = localFallback(trimmed);
        setSuggestions(local);
        setUsingFallback(local.length > 0);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInput(e) {
    onChange(e.target.value);
    setOpen(true);
    setHighlighted(-1);
  }

  function handleSelect(bird) {
    onSelect(bird);
    setOpen(false);
    setHighlighted(-1);
    setSuggestions([]);
  }

  function handleKeyDown(e) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && (loading || suggestions.length > 0);

  return (
    <div className="form-group">
      <label htmlFor="bird-input">Bird Species</label>
      <div className="autocomplete-wrapper" ref={wrapperRef}>
        <input
          id="bird-input"
          type="text"
          className="form-input"
          placeholder="e.g. Northern Cardinal"
          value={value}
          onChange={handleInput}
          onFocus={() => value.trim().length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="bird-dropdown"
          aria-activedescendant={highlighted >= 0 ? `bird-opt-${highlighted}` : undefined}
        />

        {showDropdown && (
          <ul id="bird-dropdown" className="autocomplete-dropdown" role="listbox">
            {loading && suggestions.length === 0 && (
              <li className="autocomplete-item" style={{ color: "#9aa0a6", cursor: "default" }}>
                Searching species…
              </li>
            )}
            {suggestions.map((bird, i) => {
              const imagePath = getBirdImage({
                commonName: bird.commonName,
                speciesCode: bird.speciesCode,
              });
              return (
                <li
                  key={bird.speciesCode}
                  id={`bird-opt-${i}`}
                  role="option"
                  aria-selected={i === highlighted}
                  className={`autocomplete-item${i === highlighted ? " highlighted" : ""}`}
                  onMouseDown={() => handleSelect(bird)}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  <span className="autocomplete-thumbnail">
                    {imagePath ? (
                      <img
                        src={imagePath}
                        alt={`${bird.commonName} bird image`}
                        loading="lazy"
                      />
                    ) : (
                      <span className="autocomplete-thumbnail-placeholder" aria-hidden="true">
                        Pending
                      </span>
                    )}
                  </span>
                  <span className="autocomplete-text">
                    <span className="autocomplete-common-name">{bird.commonName}</span>
                    <span className="autocomplete-scientific-name">{bird.scientificName}</span>
                  </span>
                </li>
              );
            })}
            {usingFallback && !loading && (
              <li
                style={{
                  padding: "0.35rem 0.9rem",
                  fontSize: "0.73rem",
                  color: "#9aa0a6",
                  borderTop: "1px solid #f1f3f4",
                  cursor: "default",
                }}
              >
                Showing demo species (full taxonomy unavailable)
              </li>
            )}
          </ul>
        )}
      </div>
      {error && <div className="error-msg" role="alert">{error}</div>}
    </div>
  );
}
