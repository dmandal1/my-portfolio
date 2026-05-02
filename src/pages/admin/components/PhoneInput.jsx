import React, { useState, useRef, useEffect } from "react";
import { COUNTRY_CODES } from "../../../constants/countryCodes";

export function PhoneInput({ id, name, value, onChange, placeholder = "Number", hint }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef();
  const searchRef = useRef();

  // Value is expected to be "code number" e.g. "+91 9876543210"
  const parts = (value || "").split(" ");
  const currentCode = parts[0] && parts[0].startsWith("+") ? parts[0] : "+1";
  const currentNumber = parts.slice(1).join(" ");

  const selected = COUNTRY_CODES.find((c) => c.code === currentCode) || COUNTRY_CODES.find(c => c.code === "+1");
  const selectedFlag = selected.label.split(" ")[0];

  const filtered = COUNTRY_CODES.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  useEffect(() => {
    // Auto-detect country code if value is empty or only has a default +1
    const isNewOrEmpty = !value || value.startsWith("+1 ");
    if (isNewOrEmpty) {
      fetch("https://ipapi.co/json/")
        .then(res => res.json())
        .then(data => {
          if (data.country_calling_code) {
            const code = data.country_calling_code.startsWith("+") ? data.country_calling_code : `+${data.country_calling_code}`;
            // Only update if we haven't typed anything yet
            if (isNewOrEmpty) {
              onChange(`${code} ${currentNumber}`);
            }
          }
        })
        .catch(err => console.log("Geo-location failed:", err));
    }

    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchRef.current) searchRef.current.focus();
  }, [isOpen]);

  function handleCodeSelect(code) {
    onChange(`${code} ${currentNumber}`);
    setIsOpen(false);
    setSearch("");
  }

  function handleNumberChange(e) {
    const num = e.target.value.replace(/[^\d\s\-()]/g, "");
    onChange(`${currentCode} ${num}`);
  }

  return (
    <div className="aphone-input-group">
      <div 
        className={`aphone-wrapper ${isOpen ? "is-open" : ""}`} 
        ref={containerRef}
      >
        <div className="aphone-country">
          <button
            type="button"
            className="aphone-trigger"
            onClick={() => setIsOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className="aphone-flag">{selectedFlag}</span>
            <span className="aphone-code">{currentCode}</span>
            <i className={`fas fa-chevron-down aphone-arrow ${isOpen ? "open" : ""}`} />
          </button>

          {isOpen && (
            <div className="aphone-menu" role="listbox">
              <div className="aphone-search-wrap">
                <i className="fas fa-search aphone-search-icon" />
                <input
                  id={id ? `${id}-search` : undefined}
                  name={name ? `${name}-search` : undefined}
                  ref={searchRef}
                  type="text"
                  className="aphone-search-input"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                />
                {search && (
                  <button
                    type="button"
                    className="aphone-search-clear"
                    onClick={() => setSearch("")}
                  >
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
              <ul className="aphone-list">
                {filtered.length > 0 ? filtered.map(({ code, label }) => {
                  const flag = label.split(" ")[0];
                  const name = label.replace(/^[^ ]+ /, "").replace(/ \(.*\)$/, "");
                  return (
                    <li
                      key={label}
                      className={`aphone-item ${code === currentCode ? "is-active" : ""}`}
                      onClick={() => handleCodeSelect(code)}
                      role="option"
                      aria-selected={code === currentCode}
                    >
                      <span className="aphone-item-flag">{flag}</span>
                      <span className="aphone-item-name">{name}</span>
                      <span className="aphone-item-code">{code}</span>
                    </li>
                  );
                }) : (
                  <li className="aphone-no-results">No matches</li>
                )}
              </ul>
            </div>
          )}
        </div>
        
        <div className="aphone-divider" />
        
        <input
          id={id}
          name={name}
          type="tel"
          className="aphone-number-input"
          value={currentNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
        />
      </div>
      {hint && <p className="acat-hint">{hint}</p>}
    </div>
  );
}
