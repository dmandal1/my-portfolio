import React, { useState, useRef } from "react";
import "./CertificationCard.css";

import hackerrank from "../../assests/images/hackerrank_logo.png";
import google from "../../assests/images/google_logo.png";
import cn from "../../assests/images/cn_logo.png";
import girlscript from "../../assests/images/girlscript_logo.png";
import microsoft from "../../assests/images/microsoft_logo.png";

const imageMap = {
  "hackerrank_logo.png": hackerrank,
  "google_logo.png": google,
  "cn_logo.png": cn,
  "girlscript_logo.png": girlscript,
  "microsoft_logo.png": microsoft,
};

const darkAccentMap = {
  "hackerrank_logo.png": "#2EC866",
  "google_logo.png": "#60A5FA",
  "cn_logo.png": "#F59E0B",
  "girlscript_logo.png": "#F97316",
  "microsoft_logo.png": "#7DD3FC",
};

function ExternalIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// Returns true when a hex color is too light to use as an accent/glow
function isLightColor(hex) {
  const clean = hex.replace(/^#/, "").slice(0, 6);
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  // Perceived luminance (ITU-R BT.601)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

function isDarkColor(hex) {
  const clean = hex.replace(/^#/, "").slice(0, 6);
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.18;
}

function isDarkPortfolioTheme(theme) {
  return theme?.body === "#08111f" || theme?.text === "#E8F1FF";
}

export default function CertificationCard({ certificate, theme }) {
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const cardRef = useRef(null);

  const color = certificate.color_code || "#1565C0";
  const isDarkTheme = isDarkPortfolioTheme(theme);
  // For light-colored certs (e.g. #E7E7E7) use blue so accents remain visible
  const accentColor = isDarkTheme
    ? darkAccentMap[certificate.logo_path] || (isDarkColor(color) ? "#60A5FA" : color)
    : isLightColor(color)
      ? "#1565C0"
      : color;
  const imageUrl = imageMap[certificate.logo_path] || "";
  const headerBackground = isDarkTheme
    ? `linear-gradient(180deg, #17253a 0%, #111d30 100%)`
    : isLightColor(color)
      ? `linear-gradient(145deg, #e8edf5 0%, #f0f4fb 100%)`
      : `linear-gradient(145deg, ${color}ee 0%, ${color}aa 100%)`;
  const watermark = (certificate.title || "C").trim().charAt(0).toUpperCase();

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
      className={`cert-card ${isDarkTheme ? "cert-card--dark" : ""} ${
        hovered ? "cert-hovered" : ""
      }`}
      style={{
        "--cert-accent": accentColor,
        transform: `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${
          hovered ? "translateY(-7px) scale(1.012)" : "translateY(0) scale(1)"
        }`,
        boxShadow: isDarkTheme
          ? hovered
            ? `0 0 0 1px ${accentColor}cc, 0 0 36px ${accentColor}42, 0 28px 60px rgba(0,0,0,0.42)`
            : `0 18px 44px rgba(0,0,0,0.34), 0 0 0 1px rgba(96,165,250,0.12)`
          : hovered
            ? `0 0 0 1.5px ${accentColor}, 0 0 32px ${accentColor}50, 0 32px 64px ${accentColor}24, 0 10px 28px rgba(0,0,0,0.09)`
            : `0 4px 24px rgba(21,101,192,0.11), 0 1px 4px rgba(0,0,0,0.06)`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Projects-card style top strip */}
      <div
        className="cert-top-strip"
        style={{ background: `linear-gradient(90deg, ${accentColor}, #8B5CF6 60%, #EC4899)` }}
        aria-hidden="true"
      />

      {/* Watermark letter */}
      <div className="cert-watermark" style={{ color: accentColor }} aria-hidden="true">
        {watermark}
      </div>

      {/* Cursor-following radial glow */}
      <div
        className="cert-cursor-glow"
        style={{
          background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, ${accentColor}20 0%, transparent 65%)`,
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* Shimmer sweep */}
      <div className="cert-shimmer" />

      {/* Scan line */}
      <div className="cert-scan" aria-hidden="true" />

      {/* Rotating gradient border ring */}
      <div
        className={`cert-border-ring ${hovered ? "cert-border-ring--on" : ""}`}
        style={{ "--ring-color": accentColor }}
      />

      {/* ── Coloured header strip ── */}
      <div
        className={`cert-header${isLightColor(color) ? " cert-header--light" : ""}`}
        style={{ background: headerBackground }}
      >
        <div className="cert-logo-wrap">
          <img
            className="cert-header-img"
            src={imageUrl}
            alt={certificate.alt_name}
          />
        </div>

        {/* Hover overlay — click to open cert */}
        <a
          href={certificate.certificate_link}
          target="_blank"
          rel="noopener noreferrer"
          className="cert-overlay"
        >
          <span className="cert-overlay-text">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            View Certificate
          </span>
        </a>
      </div>

      {/* ── Card body ── */}
      <div className="cert-body">
        {/* Gradient separator */}
        <div
          className="cert-sep"
          style={{
            background: `linear-gradient(90deg, ${accentColor}60, ${accentColor}15, transparent)`,
          }}
        />

        <h2 className="cert-body-title" style={{ color: theme.text }}>
          {certificate.title}
        </h2>
        <h3
          className="cert-body-subtitle"
          style={{ color: theme.secondaryText }}
        >
          {certificate.subtitle}
        </h3>

        {/* Open credential link */}
        <a
          href={certificate.certificate_link}
          target="_blank"
          rel="noopener noreferrer"
          className="cert-link"
          style={{ color: accentColor }}
        >
          <span className="cert-link-text">Open credential</span>
          <ExternalIcon />
        </a>
      </div>
    </div>
  );
}
