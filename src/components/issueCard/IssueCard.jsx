import React, { useState, useRef } from "react";
import "./IssueCard.css";

const STATE_META = {
  open:   { color: "#059669", neon: "#05966940", label: "Open",   light: "#d1fae5" },
  closed: { color: "#7c3aed", neon: "#7c3aed40", label: "Closed", light: "#ede9fe" },
};

function IssueOpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
    </svg>
  );
}

function IssueClosedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z" />
      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z" />
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

function ExternalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
      <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
    </svg>
  );
}

export default function IssueCard({ issue, theme, index = 0 }) {
  const [hovered, setHovered]         = useState(false);
  const [tilt, setTilt]               = useState({ x: 0, y: 0 });
  const [spot, setSpot]               = useState({ x: 50, y: 50 });
  const [particleKey, setParticleKey] = useState(0);
  const [avatarTip, setAvatarTip]     = useState(null);
  const cardRef                       = useRef(null);

  const stateKey = issue.closed ? "closed" : "open";
  const meta     = STATE_META[stateKey];
  const { color, neon, label, light } = meta;
  const isOpen   = !issue.closed;
  const assignee = issue.assignees?.nodes?.[0] || null;
  const StateIcon = isOpen ? IssueOpenIcon : IssueClosedIcon;

  function handleMouseMove(e) {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
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
      ? `0 0 0 2px ${color}50, 0 24px 60px ${color}22, 0 8px 28px rgba(0,0,0,0.09)`
      : "0 2px 14px rgba(15,23,42,0.07), 0 1px 3px rgba(0,0,0,0.04)",
    cursor: "pointer",
  };

  return (
    <div
      ref={cardRef}
      className={`isc-card${hovered ? " isc-hovered" : ""}`}
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        const win = window.open(issue.url, "_blank", "noopener,noreferrer");
        if (win) win.opener = null;
      }}
    >
      {/* Cursor spotlight */}
      <div
        className="isc-spotlight"
        style={{
          background: `radial-gradient(ellipse 55% 45% at ${spot.x}% ${spot.y}%, ${color}14, transparent)`,
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* FX clip: neon bar + shimmer + particles clipped to card bounds */}
      <div className="isc-fx-clip" aria-hidden="true">
        <div className="isc-neon-bar" style={{ background: `linear-gradient(90deg, ${color}, ${color}88 70%, transparent)` }} />
        <div className="isc-shimmer" />
        <div className="isc-particles">
          {[0,1,2,3,4,5].map(i => (
            <span
              key={`${particleKey}-${i}`}
              className={`isc-pt isc-pt-${i}${hovered ? " isc-pt--on" : ""}`}
              style={{ background: color }}
            />
          ))}
        </div>
      </div>

      {/* Card body */}
      <div className="isc-body">

        {/* Icon column */}
        <div
          className="isc-icon-col"
          style={{
            borderColor: `${color}33`,
            background: hovered ? color : light,
            color: hovered ? "#ffffff" : color,
          }}
        >
          <span className="isc-icon-svg"><StateIcon /></span>
          {isOpen && <span className="isc-pulse" style={{ background: color }} />}
        </div>

        <div className="isc-main">

          {/* Top row */}
          <div className="isc-top-row">
            <span className="isc-badge" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
              {isOpen && <span className="isc-live-dot" style={{ background: color }} />}
              {label}
            </span>
            {assignee && (
              <span className="isc-assigned-chip" style={{ color, background: `${color}11`, borderColor: `${color}30` }}>
                <UserIcon /> Assigned
              </span>
            )}
            <span className={`isc-ext-icon${hovered ? " isc-ext-icon--on" : ""}`} style={{ color }}>
              <ExternalIcon />
            </span>
          </div>

          {/* Title */}
          <p className="isc-title">{issue.title}</p>

          {/* Meta */}
          <div className="isc-meta">
            <span className="isc-num" style={{ color }}>#{issue.number}</span>
            <span className="isc-sep" />
            <span className="isc-date">opened {issue.createdAt?.split("T")[0]}</span>
          </div>

          {/* Divider */}
          <div className="isc-divider" />

          {/* Footer */}
          <div className="isc-bottom-row">
            <a
              className="isc-repo-link"
              href={issue.repository?.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color }}
              onClick={e => e.stopPropagation()}
            >
              <RepoIcon />
              <span className="isc-repo-text">{issue.repository?.owner?.login}/{issue.repository?.name}</span>
            </a>

            <div className="isc-avatars">
              {avatarTip && (
                <span className="isc-avatar-tip" style={{ background: color }}>{avatarTip}</span>
              )}
              {assignee && (
                <a
                  className="isc-actor"
                  href={assignee.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  onMouseEnter={() => setAvatarTip(`Assigned: ${assignee.name || assignee.login}`)}
                  onMouseLeave={() => setAvatarTip(null)}
                >
                  <img
                    className="isc-avatar"
                    src={assignee.avatarUrl}
                    alt={assignee.name || assignee.login}
                    style={{ borderColor: color }}
                  />
                </a>
              )}
              {issue.repository?.owner?.avatarUrl && (
                <a
                  className="isc-actor"
                  href={issue.repository.owner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  onMouseEnter={() => setAvatarTip(issue.repository.owner.login)}
                  onMouseLeave={() => setAvatarTip(null)}
                >
                  <img
                    className="isc-avatar"
                    src={issue.repository.owner.avatarUrl}
                    alt={issue.repository.owner.login}
                    style={{ borderColor: `${color}66` }}
                  />
                </a>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
