import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";
import profilePhoto from "../../assests/images/deepak_mandal.jpeg";
import "./PortfolioMaintenance.css";

/* ── Helpers ── */
function isExternalUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

function getTargetTime(endsAt) {
  if (!endsAt) return null;
  const date = new Date(endsAt);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

function getCountdownParts(targetTime, now) {
  if (!targetTime) return null;
  const diff = Math.max(0, targetTime - now);
  const total = Math.floor(diff / 1000);
  return {
    days:    Math.floor(total / 86400),
    hours:   Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: diff <= 0,
  };
}

function pad(v) { return String(v).padStart(2, "0"); }

/* ── CountdownCard — flips on each value change ── */
function CountdownCard({ label, value }) {
  const prev = useRef(value);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (prev.current === value) return;
    setFlip(true);
    const t = setTimeout(() => setFlip(false), 420);
    prev.current = value;
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className={`pm-count-card${flip ? " is-flipping" : ""}`}>
      <div className="pm-count-face"><strong>{pad(value)}</strong></div>
      <span>{label}</span>
    </div>
  );
}

/* ── Social icon component ── */
function SocialLink({ name, link, icon, color }) {
  if (!link) return null;

  return (
    <a
      href={link}
      className="pm-social-btn"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name}
      style={{ "--social-color": color }}
      title={name}
    >
      <i className={`fab ${icon}`} />
    </a>
  );
}

/* ── Constants ── */
const STAGES = [
  { icon: "fas fa-paint-brush", label: "Design refresh" },
  { icon: "fas fa-code",        label: "Performance tuning" },
  { icon: "fas fa-shield-alt",  label: "Security hardening" },
  { icon: "fas fa-rocket",      label: "Launch prep" },
];

/* Socials to feature on the maintenance page */
const FEATURED_SOCIALS = ["Github", "LinkedIn", "Twitter", "Gmail"];

const PARTICLE_COUNT = 16;
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => i);

function getCurrentExperience(experiences) {
  const workItems = experiences?.flatMap(section => section.experiences || []) || [];
  return workItems.find(item => /present/i.test(item.duration || "")) || workItems[0] || null;
}

function formatRole(role) {
  return String(role || "").replace(/SeniorAssociate/g, "Senior Associate").trim();
}

/* ── Main ── */
export default function PortfolioMaintenancePage({ settings = {}, theme = {} }) {
  const { profile, socialLinks, contactInfo, experiences } = usePortfolioData();
  const title      = settings.portfolioMaintenanceTitle    || "Portfolio is under maintenance";
  const message    = settings.portfolioMaintenanceMessage  || "I'm making some updates. Please check back shortly.";
  const contactUrl = settings.portfolioMaintenanceContactUrl?.trim() || "";
  const endsAt     = settings.portfolioMaintenanceEndsAt   || "";
  const showSocials = settings.portfolioMaintenanceShowSocials !== false;
  const showResume  = settings.portfolioMaintenanceShowResume  !== false;

  const whatsComing = (settings.portfolioMaintenanceWhatsComing || "")
    .split("\n").map(s => s.trim()).filter(Boolean);

  const targetTime = useMemo(() => getTargetTime(endsAt), [endsAt]);
  const [now, setNow]             = useState(() => Date.now());
  const [mousePos, setMousePos]   = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });
  const [activeStage, setActiveStage] = useState(0);
  const [notifyState, setNotifyState] = useState("idle");
  const [refreshing, setRefreshing]   = useState(false);
  const [coreHovered, setCoreHovered] = useState(false);
  const [copied, setCopied]           = useState(false);
  const pageRef = useRef(null);

  const countdown = getCountdownParts(targetTime, now);

  /* Countdown tick */
  useEffect(() => {
    if (!targetTime) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [targetTime]);

  /* Stage cycle */
  useEffect(() => {
    const t = setInterval(() => setActiveStage(s => (s + 1) % STAGES.length), 2600);
    return () => clearInterval(t);
  }, []);

  /* Mouse tracking */
  const handleMouseMove = useCallback((e) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
    if (!pageRef.current) return;
    const { width, height } = pageRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX / width  - 0.5) * 2,
      y: (e.clientY / height - 0.5) * 2,
    });
  }, []);

  const handleMouseLeave = useCallback(() => setMousePos({ x: 0, y: 0 }), []);

  /* Browser Notification API */
  async function handleNotifyMe() {
    if (!("Notification" in window)) { setNotifyState("unsupported"); return; }
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        setNotifyState("granted");
        if (targetTime) {
          const delay = targetTime - Date.now();
          if (delay > 0 && delay < 7 * 24 * 60 * 60 * 1000) {
            setTimeout(() => new Notification("Portfolio is back online!", {
              body: "Deepak Mandal's portfolio is ready. Come check it out!",
              icon: "/icons/favicon.ico",
            }), delay);
          }
        }
      } else {
        setNotifyState("denied");
      }
    } catch {
      setNotifyState("denied");
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => window.location.reload(), 900);
  }

  function handleCopyEmail() {
    const email = contactInfo?.email_address || "me@deepakmandal.dev";
    const copy = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(email)
      : Promise.reject();

    copy.then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {
      window.location.href = `mailto:${email}`;
    });
  }

  const displayEta = targetTime
    ? new Date(targetTime).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "";

  /* Theme CSS vars */
  const themeVars = {
    "--pm-bg":      theme?.body             || "#F0F8FF",
    "--pm-surface": theme?.cardBackground   || "#FFFFFF",
    "--pm-text":    theme?.text             || "#0A1628",
    "--pm-muted":   theme?.secondaryText    || "#4A6FA5",
    "--pm-accent":  theme?.imageHighlight   || theme?.gradientStart || "#1565C0",
    "--pm-accent2": theme?.gradientEnd      || "#42A5F5",
    "--pm-soft":    theme?.compImgHighlight || "#E3F2FD",
    "--pm-border":  theme?.cardBorder       || "#BBDEFB",
  };

  const mx = mousePos.x, my = mousePos.y;

  /* Filtered socials */
  const socials = (socialLinks || []).filter(s => FEATURED_SOCIALS.includes(s.name));

  const resumeLink = profile?.resumeLink || "";
  const githubLink = profile?.githubProfile || "";
  const email      = contactInfo?.email_address || "me@deepakmandal.dev";
  const authorName = profile?.title || "Deepak Mandal";
  const currentExperience = getCurrentExperience(experiences);
  const authorRole = formatRole(currentExperience?.title || profile?.job_profile?.split(" | ")[0] || "Full Stack Developer");
  const authorCompany = currentExperience?.company || "";
  const authorLocation = currentExperience?.location || "Noida, India";
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <div
      ref={pageRef}
      className="pm-page"
      style={themeVars}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Cursor glow */}
      <div
        className="pm-cursor"
        style={{ transform: `translate(${cursorPos.x - 150}px, ${cursorPos.y - 150}px)` }}
        aria-hidden="true"
      />

      {/* Particles */}
      <div className="pm-particles" aria-hidden="true">
        {PARTICLES.map(i => <span key={i} className={`pm-particle pm-particle--${i + 1}`} />)}
      </div>

      {/* Parallax background */}
      <div className="pm-grid"         style={{ translate: `${mx * -10}px ${my * -10}px` }}        aria-hidden="true" />
      <div className="pm-beam pm-beam--one"   style={{ translate: `${mx * 24}px ${my * 18}px` }}         aria-hidden="true" />
      <div className="pm-beam pm-beam--two"   style={{ translate: `${mx * -20}px ${my * -14}px` }}       aria-hidden="true" />
      <div className="pm-beam pm-beam--three" style={{ translate: `calc(-50% + ${mx * 14}px) ${my * 12}px` }} aria-hidden="true" />

      <div className="pm-shell">

        {/* ── LEFT COLUMN ── */}
        <div className="pm-left">

          {/* Orbital graphic with 3D tilt */}
          <div className="pm-visual-wrap">
            <div
              className="pm-visual"
              style={{ transform: `rotateX(${my * -8}deg) rotateY(${mx * 8}deg)` }}
              aria-hidden="true"
            >
              <div className="pm-orbit pm-orbit--outer" />
              <div className="pm-orbit pm-orbit--mid" />
              <div className="pm-orbit pm-orbit--inner" />
              <div
                className={`pm-core${coreHovered ? " is-hovered" : ""}`}
                onMouseEnter={() => setCoreHovered(true)}
                onMouseLeave={() => setCoreHovered(false)}
              >
                <i className={coreHovered ? "fas fa-wrench" : "fas fa-user-astronaut"} />
              </div>
              <span className="pm-node pm-node--1" />
              <span className="pm-node pm-node--2" />
              <span className="pm-node pm-node--3" />
              <span className="pm-node pm-node--4" />
            </div>
            <p className="pm-visual-hint"><i className="fas fa-arrows-alt" /> Move your mouse</p>
          </div>

          {/* Profile identity card */}
          <div
            className="pm-profile"
            style={{
              "--pm-card-rx": `${my * -5}deg`,
              "--pm-card-ry": `${mx * 5}deg`,
              "--pm-card-tx": `${mx * 6}px`,
              "--pm-card-ty": `${my * 6}px`,
            }}
          >
            <div className="pm-profile-glow" aria-hidden="true" />
            <div className="pm-profile-topline">
              <span className="pm-profile-status">
                <span />
                Current role
              </span>
            </div>
            <div className="pm-profile-main">
              <div className="pm-profile-avatar">
                <img src={profilePhoto} alt={authorName} />
                <span>{authorInitial}</span>
              </div>
              <div className="pm-profile-info">
                <strong>{authorName}</strong>
                <span className="pm-profile-role">{authorRole}</span>
              </div>
            </div>
            <div className="pm-profile-meta">
              {authorCompany && (
                <span className="pm-profile-chip">
                  <i className="fas fa-building" /> {authorCompany}
                </span>
              )}
              <span className="pm-profile-chip">
                <i className="fas fa-map-marker-alt" /> {authorLocation}
              </span>
            </div>
          </div>

          {/* Social links */}
          {showSocials && socials.length > 0 && (
            <div className="pm-socials">
              {socials.map(s => (
                <SocialLink
                  key={s.name}
                  name={s.name}
                  link={s.link}
                  icon={s.fontAwesomeIcon}
                  color={s.backgroundColor}
                />
              ))}
            </div>
          )}

          {/* Direct email strip */}
          <button
            type="button"
            className={`pm-email-strip${copied ? " is-copied" : ""}`}
            onClick={handleCopyEmail}
            title="Click to copy email"
          >
            <i className={copied ? "fas fa-check" : "far fa-envelope"} />
            <span>{copied ? "Copied!" : email}</span>
          </button>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="pm-content">

          <div className="pm-kicker">
            <span className="pm-pulse" />
            Maintenance Mode Active
          </div>

          <h1 className="pm-title">{title}</h1>
          <p className="pm-message">{message}</p>

          {/* Cycling work stages */}
          <div className="pm-stages">
            {STAGES.map((stage, i) => (
              <div
                key={stage.label}
                className={`pm-stage${
                  i === activeStage ? " is-active" :
                  i < activeStage  ? " is-done"   : ""
                }`}
              >
                <span className="pm-stage-icon"><i className={stage.icon} /></span>
                <span>{stage.label}</span>
                {i === activeStage && <span className="pm-stage-dot" />}
              </div>
            ))}
          </div>

          {/* Flip countdown */}
          {countdown && (
            <div className={`pm-countdown${countdown.done ? " is-done" : ""}`}>
              {countdown.done ? (
                <div className="pm-live-soon">
                  <i className="fas fa-check-circle" /> Almost ready — refresh the page
                </div>
              ) : (
                <>
                  <CountdownCard label="Days"    value={countdown.days}    />
                  <CountdownCard label="Hours"   value={countdown.hours}   />
                  <CountdownCard label="Minutes" value={countdown.minutes} />
                  <CountdownCard label="Seconds" value={countdown.seconds} />
                </>
              )}
            </div>
          )}

          {/* ETA */}
          {displayEta && (
            <div className="pm-eta">
              <i className="far fa-clock" />
              <span>Expected back online</span>
              <strong>{displayEta}</strong>
            </div>
          )}

          {/* What's coming */}
          {whatsComing.length > 0 && (
            <div className="pm-whats-coming">
              <p className="pm-wc-label">
                <i className="fas fa-star" /> What&apos;s coming
              </p>
              <ul className="pm-wc-list">
                {whatsComing.map((item, i) => (
                  <li key={i} className="pm-wc-item" style={{ animationDelay: `${0.55 + i * 0.08}s` }}>
                    <span className="pm-wc-dot" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Progress bar */}
          <div className="pm-status">
            <div className="pm-status-bar"><span /></div>
            <p className="pm-status-text">Updating design, content and performance</p>
          </div>

          {/* Primary actions */}
          <div className="pm-actions">
            <button
              type="button"
              className={`pm-btn pm-btn--primary${refreshing ? " is-refreshing" : ""}`}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <i className={`fas fa-sync-alt${refreshing ? " fa-spin" : ""}`} />
              {refreshing ? "Checking…" : "Refresh"}
            </button>

            {notifyState === "idle" && (
              <button type="button" className="pm-btn pm-btn--notify" onClick={handleNotifyMe}>
                <i className="far fa-bell" /> Notify Me
              </button>
            )}
            {notifyState === "granted" && (
              <span className="pm-notify-badge pm-notify-badge--ok">
                <i className="fas fa-check-circle" /> You'll be notified!
              </span>
            )}
            {(notifyState === "denied" || notifyState === "unsupported") && (
              <span className="pm-notify-badge pm-notify-badge--fail">
                <i className="fas fa-bell-slash" />
                {notifyState === "denied" ? "Notifications blocked" : "Not supported"}
              </span>
            )}

            {contactUrl && (
              isExternalUrl(contactUrl) ? (
                <a href={contactUrl} className="pm-btn pm-btn--ghost" target="_blank" rel="noopener noreferrer">
                  <i className="far fa-envelope" /> Contact
                </a>
              ) : (
                <a href={contactUrl} className="pm-btn pm-btn--ghost">
                  <i className="far fa-envelope" /> Contact
                </a>
              )
            )}
          </div>

          {/* Quick-access links */}
          <div className="pm-quick-links">
            {showResume && resumeLink && (
              <a href={resumeLink} className="pm-ql-btn pm-ql-btn--resume" target="_blank" rel="noopener noreferrer">
                <i className="fas fa-file-alt" />
                <span>View Resume</span>
              </a>
            )}
            {githubLink && (
              <a href={githubLink} className="pm-ql-btn pm-ql-btn--github" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-github" />
                <span>GitHub</span>
              </a>
            )}
            <a href="/#/blogs" className="pm-ql-btn pm-ql-btn--blog">
              <i className="fas fa-rss" />
              <span>Read Blog</span>
            </a>
          </div>

          <p className="pm-footer-note">
            {authorName} &bull; Portfolio &bull; Back soon
          </p>

        </div>
      </div>
    </div>
  );
}
