import { useState, useRef } from "react";

const imageModules = import.meta.glob("../../assests/images/**/*.{png,jpg,jpeg,svg,webp}", { eager: true });
function getImage(filename) {
  const key = `../../assests/images/${filename}`;
  return imageModules[key]?.default ?? "";
}
import "./ExperienceCard.css";

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function ExperienceCard({ experience, theme }) {
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const cardRef = useRef(null);

  const color = experience.color || "#1565C0";
  const isCurrent = experience.duration.toLowerCase().includes("present");
  const isDarkTheme = theme?.body === "#08111f" || theme?.text === "#E8F1FF";

  function handleMouseMove(e) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTilt({
      x: ((y - rect.height / 2) / rect.height) * -7,
      y: ((x - rect.width / 2) / rect.width) * 7,
    });
    setGlow({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  }

  function handleMouseLeave() {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
    setGlow({ x: 50, y: 50 });
  }

  return (
    <div
      ref={cardRef}
      className={`ec-card ${hovered ? "ec-hovered" : ""}`}
      style={{
        transform: `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hovered ? "translateY(-7px) scale(1.012)" : "translateY(0) scale(1)"}`,
        boxShadow: isDarkTheme
          ? hovered
            ? `0 0 0 1px ${color}cc, 0 0 34px ${color}38, 0 28px 58px rgba(0,0,0,0.4)`
            : "0 16px 40px rgba(0,0,0,0.28), 0 0 0 1px rgba(96,165,250,0.08)"
          : hovered
            ? `0 0 0 1.5px ${color}, 0 0 32px ${color}50, 0 32px 64px ${color}24, 0 10px 28px rgba(0,0,0,0.09)`
            : "0 2px 20px rgba(21,101,192,0.09)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Cursor-following radial glow */}
      <div
        className="ec-cursor-glow"
        style={{
          background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, ${color}20 0%, transparent 65%)`,
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* Shimmer sweep */}
      <div className="ec-shimmer" />

      {/* Rotating gradient border ring (visible on hover) */}
      <div
        className={`ec-border-ring ${hovered ? "ec-border-ring--on" : ""}`}
        style={{ "--ring-color": color }}
      />

      <div className="ec-inner">
        {/* ── LEFT: Colored column ── */}
        <div
          className="ec-left-col"
          style={{ background: `linear-gradient(175deg, ${color}ee 0%, ${color}99 100%)` }}
        >
          <div className="ec-logo-wrap">
            <img
              className="ec-logo"
              src={getImage(experience.logo_path)}
              alt={experience.company}
            />
          </div>
        </div>

        {/* ── RIGHT: Content ── */}
        <div className="ec-right-col">
          {/* Top row: title + badge */}
          <div className="ec-top-row">
            <h3 className="ec-title" style={{ color: theme.text }}>
              {experience.title}
            </h3>
            {isCurrent && (
              <span className="ec-badge-current">
                <span className="ec-badge-dot" />
                Current
              </span>
            )}
          </div>

          {/* Company link */}
          <a
            className="ec-company"
            href={experience.company_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color }}
          >
            <span className="ec-company-underline">{experience.company}</span>
            <span className="ec-ext"><ExternalIcon /></span>
          </a>

          {/* Meta chips */}
          <div className="ec-meta">
            <span className="ec-chip" style={{ borderColor: `${color}30`, color: theme.secondaryText }}>
              <CalendarIcon />
              {experience.duration}
            </span>
            <span className="ec-chip" style={{ borderColor: `${color}30`, color: theme.secondaryText }}>
              <LocationIcon />
              {experience.location}
            </span>
          </div>

          {/* Gradient separator */}
          <div className="ec-sep" style={{ background: `linear-gradient(90deg, ${color}60, ${color}15, transparent)` }} />

          {/* Description */}
          <p className="ec-desc" style={{ color: theme.text }}>
            {experience.description}
          </p>
        </div>
      </div>
    </div>
  );
}
