import { useState, useRef, useEffect } from "react";
import SUPPORTED_BIRDS from "../data/supportedBirds";

export default function BirdAutocomplete({ value, onChange, onSelect, error }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapperRef = useRef(null);

  const filtered = value.trim().length === 0
    ? []
    : SUPPORTED_BIRDS.filter((b) =>
        b.commonName.toLowerCase().includes(value.toLowerCase()) ||
        b.scientificName.toLowerCase().includes(value.toLowerCase())
      );

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
  }

  function handleKeyDown(e) {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="form-group">
      <label htmlFor="bird-input">Bird Species</label>
      <div className="autocomplete-wrapper" ref={wrapperRef}>
        <input
          id="bird-input"
          type="text"
          className="form-input"
          placeholder="e.g. Bald Eagle"
          value={value}
          onChange={handleInput}
          onFocus={() => value.trim() && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open && filtered.length > 0}
          aria-controls="bird-dropdown"
          aria-activedescendant={highlighted >= 0 ? `bird-opt-${highlighted}` : undefined}
        />
        {open && filtered.length > 0 && (
          <ul
            id="bird-dropdown"
            className="autocomplete-dropdown"
            role="listbox"
          >
            {filtered.map((bird, i) => (
              <li
                key={bird.speciesCode}
                id={`bird-opt-${i}`}
                role="option"
                aria-selected={i === highlighted}
                className={`autocomplete-item${i === highlighted ? " highlighted" : ""}`}
                onMouseDown={() => handleSelect(bird)}
                onMouseEnter={() => setHighlighted(i)}
              >
                <span className="autocomplete-item-name">{bird.commonName}</span>
                <span className="autocomplete-item-sci">{bird.scientificName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <div className="error-msg" role="alert">{error}</div>}
    </div>
  );
}
