import React, { useState, useEffect, useRef } from "react";
import "./AiAvatarVideo.css";

export default function AiAvatarVideo({ theme }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasInteractedSound, setHasInteractedSound] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(8);
  const [isEnded, setIsEnded] = useState(false);
  const [isTheaterOpen, setIsTheaterOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState("intro");
  const [isHovered, setIsHovered] = useState(false);

  // Auto-play muted on mount so the AI avatar is immediately moving and alive
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    setIsMuted(true);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, []);

  // Update time and progress
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const cur = video.currentTime;
    const dur = video.duration || 8;
    setCurrentTime(cur);
    setDuration(dur);
    setProgress((cur / dur) * 100);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setIsEnded(true);
  };

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      if (isEnded) {
        video.currentTime = 0;
        setIsEnded(false);
      }
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const enableSoundAndPlay = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    setIsMuted(false);
    setHasInteractedSound(true);

    // If near end or ended, restart with voice
    if (isEnded || video.currentTime >= (video.duration || 8) - 0.5) {
      video.currentTime = 0;
      setIsEnded(false);
    }

    video.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const toggleMute = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted) setHasInteractedSound(true);
  };

  const handleProgressClick = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * (video.duration || 8);
  };

  const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    return `0:0${s}`.slice(-4);
  };

  // Close theater on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setIsTheaterOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const topics = [
    { id: "intro", icon: "👋", label: "Intro", text: "Hi, I'm Deepak! Full Stack Engineer & Cloud Developer." },
    { id: "stack", icon: "⚡", label: "Skills", text: "React, Node.js, TypeScript, Next.js, Cloud Architectures." },
    { id: "work", icon: "🚀", label: "Open to Work", text: "Ready for high-impact roles, engineering contracts & collaboration." }
  ];

  return (
    <div
      ref={containerRef}
      className="ai-avatar-card-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Outer ambient glow */}
      <div className={`ai-ambient-glow ${isPlaying ? "ai-ambient-glow--active" : ""}`} />

      {/* Main Hologram Frame */}
      <div className="ai-hologram-frame">
        {/* Futuristic Top Status Bar */}
        <div className="ai-hud-header">
          <div className="ai-hud-status">
            <span className="ai-live-dot" />
            <span className="ai-hud-label">AI AVATAR LIVE</span>
            <span className="ai-version-pill">v2.6</span>
          </div>

          <div className="ai-hud-actions">
            {/* Audio wave visualizer */}
            <div className={`ai-audio-wave ${isPlaying && !isMuted ? "ai-audio-wave--active" : ""}`}>
              <span className="wave-bar b1" />
              <span className="wave-bar b2" />
              <span className="wave-bar b3" />
              <span className="wave-bar b4" />
              <span className="wave-bar b5" />
            </div>

            {/* Theater Mode Button */}
            <button
              type="button"
              className="ai-theater-btn"
              onClick={() => setIsTheaterOpen(true)}
              title="Expand in AI Theater Mode"
              aria-label="Expand in AI Theater Mode"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Video Viewport */}
        <div className="ai-video-viewport" onClick={isMuted ? enableSoundAndPlay : togglePlay}>
          <video
            ref={videoRef}
            playsInline
            loop={isMuted} // Loop silently when muted, don't loop if unmuted so user hears speech
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            className="ai-video-element"
            poster={`${import.meta.env.BASE_URL || "./"}icons/android-icon-192x192.png`}
          >
            <source src={`${import.meta.env.BASE_URL || "./"}intro.mp4`} type="video/mp4" />
            <source src={`${import.meta.env.BASE_URL || "./"}intro.webm`} type="video/webm" />
            Your browser does not support video playback.
          </video>

          {/* Hologram scan line overlay */}
          <div className="ai-scanline" />

          {/* Floating Sound Prompt Banner (when video is playing muted) */}
          {isPlaying && isMuted && (
            <div className="ai-sound-prompt-pill" onClick={enableSoundAndPlay}>
              <span className="sound-icon-pulse">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </span>
              <span>Tap for AI Voice 🔊</span>
            </div>
          )}

          {/* Center Play/Replay Overlay (shown when paused or ended) */}
          {(!isPlaying || isEnded) && (
            <div className="ai-center-overlay" onClick={isMuted ? enableSoundAndPlay : togglePlay}>
              <div className="ai-play-pulse-ring" />
              <button
                type="button"
                className="ai-play-center-btn"
                aria-label={isEnded ? "Replay AI Introduction" : "Play AI Introduction"}
              >
                {isEnded ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>
              <span className="ai-play-tagline">
                {isEnded ? "Replay Intro" : isMuted ? "Play with AI Voice" : "Resume"}
              </span>
            </div>
          )}

          {/* Bottom Floating Glass HUD Controls */}
          <div className={`ai-hud-controls ${isHovered || !isPlaying ? "ai-hud-controls--visible" : ""}`} onClick={(e) => e.stopPropagation()}>
            {/* Progress scrubber */}
            <div className="ai-timeline-bar" onClick={handleProgressClick}>
              <div className="ai-timeline-fill" style={{ width: `${progress}%` }} />
            </div>

            <div className="ai-controls-row">
              <div className="ai-left-controls">
                <button
                  type="button"
                  className="ai-ctrl-icon-btn"
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  className={`ai-ctrl-icon-btn ${!isMuted ? "ai-ctrl-icon-btn--sound-on" : ""}`}
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute Sound" : "Mute Sound"}
                  title={isMuted ? "Unmute Sound" : "Mute Sound"}
                >
                  {isMuted ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>

                <span className="ai-time-label">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="ai-right-controls">
                <button
                  type="button"
                  className="ai-ctrl-icon-btn"
                  onClick={() => setIsTheaterOpen(true)}
                  title="Expand Theater View"
                  aria-label="Expand Theater View"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Interactive Intel Dossier */}
        <div className="ai-dossier-card">
          <div className="ai-dossier-header">
            <span className="ai-dossier-tag">✨ AI DIGITAL TWIN</span>
            <span className="ai-dossier-badge">Interactive</span>
          </div>

          <div className="ai-topics-row">
            {topics.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`ai-topic-chip ${activeTopic === t.id ? "ai-topic-chip--active" : ""}`}
                onClick={() => setActiveTopic(t.id)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="ai-topic-preview">
            <p className="ai-topic-text">
              {topics.find((t) => t.id === activeTopic)?.text}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded AI Theater Modal */}
      {isTheaterOpen && (
        <div className="ai-theater-backdrop" onClick={() => setIsTheaterOpen(false)}>
          <div className="ai-theater-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ai-theater-close-btn"
              onClick={() => setIsTheaterOpen(false)}
              aria-label="Close Theater"
            >
              ✕
            </button>

            <div className="ai-theater-grid">
              {/* Theater Video Column */}
              <div className="ai-theater-video-box">
                <video
                  autoPlay
                  controls
                  playsInline
                  className="ai-theater-video"
                  src={`${import.meta.env.BASE_URL || "./"}intro.mp4`}
                >
                  <source src={`${import.meta.env.BASE_URL || "./"}intro.mp4`} type="video/mp4" />
                  <source src={`${import.meta.env.BASE_URL || "./"}intro.webm`} type="video/webm" />
                </video>
              </div>

              {/* Theater Dossier Column */}
              <div className="ai-theater-info-box">
                <div className="ai-theater-badge-row">
                  <span className="ai-theater-live-pill">● AI INTRO EXPERIENCE</span>
                  <span className="ai-theater-verified">Verified Profile</span>
                </div>

                <h3 className="ai-theater-title">Deepak Mandal</h3>
                <p className="ai-theater-role">Full Stack Software Developer & Architect</p>

                <p className="ai-theater-bio">
                  Welcome to my portfolio! I build resilient, high-speed web apps, microservices, and modern user experiences using React, Node.js, and cloud platforms.
                </p>

                <div className="ai-theater-stats">
                  <div className="ai-th-stat">
                    <strong>5+</strong>
                    <span>Years Exp</span>
                  </div>
                  <div className="ai-th-stat">
                    <strong>25+</strong>
                    <span>Projects</span>
                  </div>
                  <div className="ai-th-stat">
                    <strong>100%</strong>
                    <span>Impact</span>
                  </div>
                </div>

                <div className="ai-theater-actions">
                  <a
                    href="https://drive.google.com/file/d/1pfqYOM0ByHmTsEbPJ-_nLh5jRjQ8jaPE/view"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ai-theater-cta-primary"
                  >
                    📄 View Resume
                  </a>
                  <a
                    href="#/contact"
                    onClick={() => setIsTheaterOpen(false)}
                    className="ai-theater-cta-secondary"
                  >
                    💬 Get in Touch
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
