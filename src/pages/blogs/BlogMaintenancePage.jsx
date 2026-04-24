import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./BlogMaintenance.css";

function isExternalUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

function getTargetTime(settings) {
  const value = settings.blogMaintenanceEndsAt;
  if (!value) return null;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

function getCountdownParts(targetTime, now) {
  if (!targetTime) return null;
  const diff = Math.max(0, targetTime - now);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, done: diff <= 0 };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function CountdownCard({ label, value }) {
  return (
    <div className="bm-count-card">
      <strong>{pad(value)}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function BlogMaintenancePage({ settings, theme }) {
  const title = settings.blogMaintenanceTitle || "Blogs are under maintenance";
  const message = settings.blogMaintenanceMessage || "I am improving the blog experience. Please check back shortly.";
  const contactUrl = settings.blogMaintenanceContactUrl?.trim();
  const showHomeLink = settings.blogMaintenanceShowHomeLink !== false;
  const targetTime = useMemo(() => getTargetTime(settings), [settings]);
  const [now, setNow] = useState(() => Date.now());
  const countdown = getCountdownParts(targetTime, now);

  useEffect(() => {
    if (!targetTime) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [targetTime]);

  const displayEta = targetTime
    ? new Date(targetTime).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    : "";
  const themeVars = {
    "--bm-bg": theme?.body || "#F0F8FF",
    "--bm-surface": theme?.cardBackground || "#FFFFFF",
    "--bm-text": theme?.text || "#0A1628",
    "--bm-muted": theme?.secondaryText || "#4A6FA5",
    "--bm-accent": theme?.imageHighlight || theme?.gradientStart || "#1565C0",
    "--bm-accent-2": theme?.gradientEnd || "#42A5F5",
    "--bm-soft": theme?.compImgHighlight || "#E3F2FD",
    "--bm-border": theme?.cardBorder || "#BBDEFB",
    "--bm-glow": theme?.accentGlow || "rgba(66, 165, 245, 0.24)",
  };

  return (
    <main className="bm-page" style={themeVars} aria-labelledby="blog-maintenance-title">
      <div className="bm-grid" aria-hidden="true" />
      <div className="bm-beam bm-beam--one" aria-hidden="true" />
      <div className="bm-beam bm-beam--two" aria-hidden="true" />

      <section className="bm-shell">
        <div className="bm-visual" aria-hidden="true">
          <div className="bm-orbit bm-orbit--outer" />
          <div className="bm-orbit bm-orbit--inner" />
          <div className="bm-core">
            <i className="fas fa-code" />
          </div>
          <span className="bm-node bm-node--one" />
          <span className="bm-node bm-node--two" />
          <span className="bm-node bm-node--three" />
        </div>

        <div className="bm-content">
          <div className="bm-kicker">
            <span className="bm-pulse" />
            Blog Maintenance Mode
          </div>

          <h1 id="blog-maintenance-title">{title}</h1>
          <p className="bm-message">{message}</p>

          {countdown && (
            <div className={`bm-countdown${countdown.done ? " is-done" : ""}`} aria-label="Countdown until blog is live">
              {countdown.done ? (
                <div className="bm-live-soon">
                  <i className="fas fa-check-circle" />
                  Updates are almost ready
                </div>
              ) : (
                <>
                  <CountdownCard label="Days" value={countdown.days} />
                  <CountdownCard label="Hours" value={countdown.hours} />
                  <CountdownCard label="Minutes" value={countdown.minutes} />
                  <CountdownCard label="Seconds" value={countdown.seconds} />
                </>
              )}
            </div>
          )}

          {displayEta && (
            <div className="bm-eta">
              <i className="far fa-clock" />
              <span>Expected back online</span>
              <strong>{displayEta}</strong>
            </div>
          )}

          <div className="bm-status">
            <div className="bm-status-line">
              <span />
            </div>
            <div className="bm-status-text">
              <strong>Optimizing posts, code blocks, and reading experience</strong>
              <small>Refresh after the countdown completes.</small>
            </div>
          </div>

          <div className="bm-actions">
            {showHomeLink && (
              <Link to="/home" className="bm-btn bm-btn-primary">
                <i className="fas fa-home" />
                Portfolio Home
              </Link>
            )}
            {contactUrl && (
              isExternalUrl(contactUrl) ? (
                <a href={contactUrl} className="bm-btn bm-btn-ghost" target="_blank" rel="noopener noreferrer">
                  <i className="far fa-envelope" />
                  Contact
                </a>
              ) : (
                <a href={contactUrl} className="bm-btn bm-btn-ghost">
                  <i className="far fa-envelope" />
                  Contact
                </a>
              )
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
