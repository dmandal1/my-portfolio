import React, { useState, useRef } from "react";
import "./GithubRepoCard.css";

const LANG_META = {
  Python:     { color: "#2563EB", light: "#DBEAFE" },
  JavaScript: { color: "#D97706", light: "#FEF3C7" },
  TypeScript: { color: "#0EA5E9", light: "#E0F2FE" },
  HTML:       { color: "#DC2626", light: "#FEE2E2" },
  CSS:        { color: "#7C3AED", light: "#EDE9FE" },
  C:          { color: "#6D28D9", light: "#EDE9FE" },
  "C++":      { color: "#6D28D9", light: "#EDE9FE" },
  Java:       { color: "#EA580C", light: "#FFEDD5" },
  Shell:      { color: "#16A34A", light: "#DCFCE7" },
  Go:         { color: "#0891B2", light: "#CFFAFE" },
  Rust:       { color: "#B91C1C", light: "#FEE2E2" },
  Ruby:       { color: "#BE185D", light: "#FCE7F3" },
};
const DEFAULT_META = { color: "#1D4ED8", light: "#DBEAFE" };

function getAccent(langs) {
  if (!langs?.length) return DEFAULT_META.color;
  return (LANG_META[langs[0].name] || DEFAULT_META).color;
}

function GitHubIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function isDarkColor(hex) {
  if (!hex) return false;
  const c = parseInt(hex.replace("#", ""), 16);
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

export default function GithubRepoCard({ repo, theme, index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt]       = useState({ x: 0, y: 0 });
  const [spot, setSpot]       = useState({ x: 50, y: 40 });
  const cardRef               = useRef(null);

  const isDark   = isDarkColor(theme?.cardBackground);
  const cardBg   = theme?.cardBackground || "#ffffff";
  const cardBorder = theme?.cardBorder || "#e8eef6";
  const accent   = getAccent(repo.languages);
  const initial  = (repo.name || "R")[0].toUpperCase();
  const num      = String(index + 1).padStart(2, "0");
  const langMeta = repo.languages?.length
    ? (LANG_META[repo.languages[0].name] || DEFAULT_META)
    : DEFAULT_META;

  function handleMouseMove(e) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTilt({
      x: ((y - rect.height / 2) / rect.height) * -8,
      y: ((x - rect.width  / 2) / rect.width ) *  8,
    });
    setSpot({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  }

  function handleMouseLeave() {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
    setSpot({ x: 50, y: 40 });
  }

  return (
    <div
      ref={cardRef}
      className={`rc-wrap ${hovered ? "rc-hovered" : ""}`}
      style={{
        "--accent": accent,
        "--accent-light": langMeta.light,
        "--delay":  `${index * 0.09}s`,
        "--card-bg": cardBg,
        "--card-border": cardBorder,
        "--badge-color": isDark ? "rgba(232, 241, 255, 0.22)" : "rgba(15, 23, 42, 0.15)",
        "--footer-border": isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.055)",
        "--shimmer-color": isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.88)",
        background: hovered
          ? `linear-gradient(160deg, ${cardBg} 60%, color-mix(in srgb, ${accent} ${isDark ? 10 : 4}%, ${cardBg}))`
          : cardBg,
        transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${
          hovered ? "translateY(-12px) scale(1.022)" : "translateY(0) scale(1)"
        }`,
        boxShadow: hovered
          ? `0 0 0 2px ${accent}66, 0 28px 70px ${accent}28, 0 12px 36px rgba(0,0,0,0.12)`
          : isDark
            ? `0 2px 18px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)`
            : `0 2px 18px rgba(15,23,42,0.07), 0 1px 4px rgba(0,0,0,0.04)`,
        cursor: "pointer",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        const win = window.open(repo.url, "_blank", "noopener,noreferrer");
        if (win) win.opener = null;
      }}
    >
      {/* Top gradient strip */}
      <div className="rc-top-strip" style={{ background: `linear-gradient(90deg, ${accent}, #8B5CF6 60%, #EC4899)` }} />

      {/* Watermark letter */}
      <div className="rc-watermark" style={{ color: accent }}>{initial}</div>

      {/* Cursor spotlight */}
      <div
        className="rc-spotlight"
        style={{
          background: `radial-gradient(ellipse 55% 45% at ${spot.x}% ${spot.y}%, ${accent}14, transparent)`,
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* Shimmer sweep */}
      <div className="rc-shimmer" />

      {/* Scan line */}
      <div className="rc-scan" />

      {/* Floating particles */}
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className={`rc-p rc-p${n}`} style={{ background: accent }} />
      ))}

      {/* Content */}
      <div className="rc-content">

        {/* Header: icon + number */}
        <div className="rc-header-row">
          <div className="rc-icon-area">
            <div className="rc-icon-halo" style={{ background: accent }} />
            <div className="rc-ring rc-ring-a" style={{ borderColor: `${accent}55` }} />
            <div className="rc-ring rc-ring-b" style={{ borderColor: `${accent}30` }} />
            <div
              className="rc-icon-box"
              style={{
                background: hovered ? accent : langMeta.light,
                color:      hovered ? "#ffffff" : accent,
                boxShadow:  hovered ? `0 8px 24px ${accent}55` : "none",
              }}
            >
              {initial}
            </div>
          </div>
          <div className="rc-header-right">
            <span className="rc-badge">{num}</span>
            {repo.languages?.length > 0 && (
              <span
                className="rc-lang-pill"
                style={{ color: accent, background: isDark ? `${accent}20` : langMeta.light, borderColor: `${accent}33` }}
              >
                {repo.languages[0].name}
              </span>
            )}
          </div>
        </div>

        {/* Title + arrow */}
        <div className="rc-title-row">
          <h3
            className="rc-name"
            style={hovered ? {
              background: `linear-gradient(135deg, ${accent} 0%, #8B5CF6 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            } : { color: theme?.text || "#0f172a" }}
          >
            {repo.name}
          </h3>
          <span className={`rc-arrow ${hovered ? "rc-arrow--on" : ""}`} style={{ color: accent }}>
            <ArrowIcon />
          </span>
        </div>

        {/* Accent draw bar */}
        <div
          className="rc-accent-bar"
          style={{ background: `linear-gradient(90deg, ${accent}, #8B5CF6 60%, transparent)` }}
        />

        {/* Description */}
        <p className="rc-desc" style={{ color: theme?.secondaryText || "#64748b" }}>
          {repo.description || "No description provided."}
        </p>

        {/* Language chips */}
        {repo.languages?.length > 0 && (
          <div className="rc-chips">
            {repo.languages.map((lang, i) => {
              const m = LANG_META[lang.name] || DEFAULT_META;
              return (
                <span
                  key={lang.name}
                  className="rc-chip"
                  style={{ "--ci": i, "--glow": `${m.color}44`, color: m.color, background: isDark ? `${m.color}20` : m.light, borderColor: `${m.color}22` }}
                >
                  <span className="rc-dot" style={{ background: m.color, boxShadow: hovered ? `0 0 6px ${m.color}` : "none" }} />
                  {lang.name}
                </span>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="rc-footer">
          <span className="rc-date" style={{ color: theme?.secondaryText || "#94a3b8" }}>
            <CalendarIcon />
            {repo.createdAt?.split("T")[0]}
          </span>
          <span
            className={`rc-github-btn ${hovered ? "rc-github-btn--on" : ""}`}
            style={hovered ? {
              background: `linear-gradient(135deg, ${accent}, #8B5CF6)`,
              color: "#ffffff",
              borderColor: "transparent",
              boxShadow: `0 6px 20px ${accent}50`,
            } : {
              color: accent,
              borderColor: `${accent}44`,
              background: `${accent}0d`,
            }}
          >
            <GitHubIcon />
            GitHub
          </span>
        </div>

      </div>
    </div>
  );
}
