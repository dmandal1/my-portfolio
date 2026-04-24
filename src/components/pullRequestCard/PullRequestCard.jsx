import React, { useState, useRef } from "react";
import "./PullRequestCard.css";

const STATE_META = {
  OPEN:   { color: "#059669", neon: "#05966940", label: "Open",   light: "#d1fae5" },
  MERGED: { color: "#7c3aed", neon: "#7c3aed40", label: "Merged", light: "#ede9fe" },
  CLOSED: { color: "#dc2626", neon: "#dc262640", label: "Closed", light: "#fee2e2" },
};

function isDarkPortfolioTheme(theme) {
  return theme?.body === "#08111f" || theme?.text === "#E8F1FF";
}

function PROpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
    </svg>
  );
}
function PRMergeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0 0 .005V3.25Z" />
    </svg>
  );
}
function PRClosedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 14a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm9.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM14 7a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z" />
    </svg>
  );
}
function ExternalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688Z" />
    </svg>
  );
}
function RepoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5Z" />
    </svg>
  );
}

export default function PullRequestCard({ pullRequest, theme, index = 0 }) {
  const [hovered, setHovered]         = useState(false);
  const [tilt, setTilt]               = useState({ x: 0, y: 0 });
  const [spot, setSpot]               = useState({ x: 50, y: 50 });
  const [particleKey, setParticleKey] = useState(0);
  const [avatarTip, setAvatarTip]     = useState(null);
  const cardRef                       = useRef(null);

  const meta    = STATE_META[pullRequest.state] || STATE_META.CLOSED;
  const { color, neon, label, light } = meta;
  const isDark = isDarkPortfolioTheme(theme);
  const isOpen  = pullRequest.state === "OPEN";
  const StateIcon = pullRequest.state === "MERGED" ? PRMergeIcon
                  : pullRequest.state === "CLOSED"  ? PRClosedIcon
                  : PROpenIcon;

  const add   = pullRequest.additions  || 0;
  const del   = pullRequest.deletions  || 0;
  const total = add + del || 1;
  const addPct = Math.round((add / total) * 100);

  function handleMouseMove(e) {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    setTilt({ x: ((y - r.height/2)/r.height)*-7, y: ((x - r.width/2)/r.width)*7 });
    setSpot({ x: (x/r.width)*100, y: (y/r.height)*100 });
  }
  function handleMouseEnter() { setHovered(true); setParticleKey(k => k + 1); }
  function handleMouseLeave() { setHovered(false); setTilt({x:0,y:0}); setSpot({x:50,y:50}); }

  const cardStyle = {
    "--color":  color,
    "--neon":   neon,
    "--delay":  `${index * 0.08}s`,
    "--spot-x": `${spot.x}%`,
    "--spot-y": `${spot.y}%`,
    transform: hovered
      ? `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-10px) scale(1.018)`
      : "perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)",
    boxShadow: hovered
      ? (isDark
          ? `0 0 0 1px rgba(255,255,255,0.06), 0 0 0 2px ${color}45, 0 28px 86px rgba(0,0,0,0.58), 0 14px 40px ${color}18`
          : `0 0 0 2px ${color}50, 0 24px 60px ${color}22, 0 8px 28px rgba(0,0,0,0.09)`)
      : (isDark
          ? "0 16px 60px rgba(0,0,0,0.46), 0 0 0 1px rgba(255,255,255,0.05)"
          : "0 2px 14px rgba(15,23,42,0.07), 0 1px 3px rgba(0,0,0,0.04)"),
    cursor: "pointer",
  };

  const iconBg = hovered ? color : (isDark ? `${color}26` : light);

  return (
    <div
      ref={cardRef}
      className={`prc-card${hovered ? " prc-hovered" : ""}`}
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        const win = window.open(pullRequest.url, "_blank", "noopener,noreferrer");
        if (win) win.opener = null;
      }}
    >
      {/* Cursor spotlight */}
      <div
        className="prc-spotlight"
        style={{
          background: `radial-gradient(ellipse 55% 45% at ${spot.x}% ${spot.y}%, ${color}${isDark ? "24" : "14"}, transparent)`,
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* FX clip: neon bar + shimmer + particles clipped to card bounds */}
      <div className="prc-fx-clip" aria-hidden="true">
        <div className="prc-neon-bar" style={{ background: `linear-gradient(90deg, ${color}, ${color}88 70%, transparent)` }} />
        <div className="prc-shimmer" />
        <div className="prc-particles">
          {[0,1,2,3,4,5].map(i => (
            <span
              key={`${particleKey}-${i}`}
              className={`prc-pt prc-pt-${i}${hovered ? " prc-pt--on" : ""}`}
              style={{ background: color }}
            />
          ))}
        </div>
      </div>

      {/* Card content */}
      <div className="prc-body">

        {/* Icon column */}
        <div
          className="prc-icon-col"
          style={{
            borderColor: `${color}33`,
            background: iconBg,
            color: hovered ? "#ffffff" : color,
          }}
        >
          <span className="prc-icon-svg"><StateIcon /></span>
          {isOpen && <span className="prc-pulse" style={{ background: color }} />}
        </div>

        <div className="prc-main">

          {/* Top row */}
          <div className="prc-top-row">
            <span className="prc-badge" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
              {isOpen && <span className="prc-badge-dot" style={{ background: color }} />}
              {label}
            </span>
            <span className="prc-file-chip">
              <FileIcon /> {pullRequest.changedFiles} files
            </span>
            <span className={`prc-ext-icon${hovered ? " prc-ext-icon--on" : ""}`} style={{ color }}>
              <ExternalIcon />
            </span>
          </div>

          {/* Title */}
          <p className="prc-title">{pullRequest.title}</p>

          {/* Meta */}
          <div className="prc-meta">
            <span className="prc-num" style={{ color }}>#{pullRequest.number}</span>
            <span className="prc-sep" />
            <span className="prc-date">{pullRequest.createdAt?.split("T")[0]}</span>
            <span className="prc-sep" />
            <a
              className="prc-repo-link"
              href={pullRequest.baseRepository.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color }}
              onClick={e => e.stopPropagation()}
            >
              <RepoIcon />
              {pullRequest.baseRepository.owner.login}/{pullRequest.baseRepository.name}
            </a>
          </div>

          {/* Divider */}
          <div className="prc-divider" />

          {/* Bottom: diff + avatars */}
          <div className="prc-bottom">
            <div className="prc-diff">
              <div className="prc-diff-track">
                <div className="prc-diff-add" style={{ width: `${addPct}%` }} />
                <div className="prc-diff-del" style={{ width: `${100-addPct}%` }} />
              </div>
              <span className="prc-add">+{add.toLocaleString()}</span>
              <span className="prc-del">−{del.toLocaleString()}</span>
            </div>

            <div className="prc-avatars">
              {avatarTip && (
                <span className="prc-avatar-tip" style={{ background: color }}>{avatarTip}</span>
              )}
              {pullRequest.mergedBy && (
                <a
                  className="prc-actor"
                  href={pullRequest.mergedBy.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  onMouseEnter={() => setAvatarTip(`Merged by ${pullRequest.mergedBy.login}`)}
                  onMouseLeave={() => setAvatarTip(null)}
                >
                  <img
                    className="prc-avatar"
                    src={pullRequest.mergedBy.avatarUrl}
                    alt={pullRequest.mergedBy.login}
                    style={{ borderColor: color }}
                  />
                </a>
              )}
              <a
                className="prc-actor"
                href={pullRequest.baseRepository.owner.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                onMouseEnter={() => setAvatarTip(pullRequest.baseRepository.owner.login)}
                onMouseLeave={() => setAvatarTip(null)}
              >
                <img
                  className="prc-avatar"
                  src={pullRequest.baseRepository.owner.avatarUrl}
                  alt={pullRequest.baseRepository.owner.login}
                  style={{ borderColor: `${color}66` }}
                />
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
