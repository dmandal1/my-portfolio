import React, { useState, useEffect, useRef } from "react";
import "./AiAvatarVideo.css";

export default function AiAvatarVideo({ theme }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasSoundStarted, setHasSoundStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(8);
  const [isEnded, setIsEnded] = useState(false);
  const [activeTopic, setActiveTopic] = useState("intro");
  const [isHovered, setIsHovered] = useState(false);

  // Start with audio enabled (triggered by user click)
  const playWithSound = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.muted = false;
    video.volume = 1.0;
    setIsMuted(false);
    setHasSoundStarted(true);
    setIsEnded(false);
    video.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  // Muted background loop on initial load
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    setIsMuted(true);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    // Listen for custom event from hero "Watch Intro" button
    const onHeroPlayTrigger = () => {
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      playWithSound();
    };

    window.addEventListener("playIntroVideo", onHeroPlayTrigger);
    return () => {
      window.removeEventListener("playIntroVideo", onHeroPlayTrigger);
    };
  }, []);

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

  const toggleMute = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !isMuted;
    video.muted = nextMuted;
    video.volume = nextMuted ? 0 : 1.0;
    setIsMuted(nextMuted);

    if (!nextMuted) {
      setHasSoundStarted(true);
      if (video.paused) {
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
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

  const topics = [
    {
      id: "intro",
      icon: "👋",
      label: "Intro Tour",
      text: "Hi, I'm Deepak Mandal! Full Stack Software Developer & Cloud Architect with 5+ years of experience building resilient web applications and microservices."
    },
    {
      id: "stack",
      icon: "⚡",
      label: "Tech Stack",
      text: "Expertise in React, Node.js, TypeScript, Next.js, PostgreSQL, Docker, Redis, and Cloud Native Architectures."
    },
    {
      id: "work",
      icon: "🚀",
      label: "Open to Work",
      text: "Actively available for high-impact full-time engineering roles, technical leadership, and contract collaborations."
    }
  ];

  return (
    <div
      ref={containerRef}
      className="ai-avatar-card-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Outer ambient glow */}
      <div className={`ai-ambient-glow ${!isMuted && isPlaying ? "ai-ambient-glow--active" : ""}`} />

      {/* Main Hologram Frame */}
      <div className="ai-hologram-frame">
        {/* Top Status Bar */}
        <div className="ai-hud-header">
          <div className="ai-hud-status">
            <span className="ai-live-dot" />
            <span className="ai-hud-label">INTRO VIDEO</span>
          </div>

          <div className="ai-hud-actions">
            <button
              type="button"
              className="ai-sound-btn"
              onClick={toggleMute}
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
              aria-label={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              <span>{isMuted ? "🔇 Unmute" : "🔊 Sound On"}</span>
            </button>
          </div>
        </div>

        {/* Video Viewport */}
        <div className="ai-video-viewport" onClick={isMuted ? playWithSound : togglePlay}>
          <video
            ref={videoRef}
            playsInline
            loop={isMuted} // Loop silently during preview, stop on end when sound is playing
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            className="ai-video-element"
            poster={`${import.meta.env.BASE_URL || "./"}icons/android-icon-192x192.png`}
          >
            <source src={`${import.meta.env.BASE_URL || "./"}intro.webm`} type="video/webm" />
            <source src={`${import.meta.env.BASE_URL || "./"}intro.mp4`} type="video/mp4" />
            Your browser does not support video playback.
          </video>

          {/* Hologram scan line */}
          <div className="ai-scanline" />

          {/* Center Play Button when Muted or Paused */}
          {(!hasSoundStarted || isMuted || !isPlaying || isEnded) && (
            <div className="ai-center-overlay" onClick={playWithSound}>
              <div className="ai-play-pulse-ring" />
              <button
                type="button"
                className="ai-play-center-btn"
                aria-label={isEnded ? "Replay Video" : "Play Video with Sound"}
              >
                {isEnded ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>

              <div className="ai-sound-cta-badge">
                <span className="sound-pulse-icon">▶</span>
                <span>{isEnded ? "Replay Video" : "Click to Play Video"}</span>
              </div>
            </div>
          )}

          {/* Bottom Floating Glass Controls */}
          <div
            className={`ai-hud-controls ${isHovered || !isPlaying ? "ai-hud-controls--visible" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
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
                  aria-label={isMuted ? "Unmute Audio" : "Mute Audio"}
                  title={isMuted ? "Unmute Audio" : "Mute Audio"}
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
            </div>
          </div>
        </div>

        {/* Bottom Interactive Highlights Dossier */}
        <div className="ai-dossier-card">
          <div className="ai-dossier-header">
            <span className="ai-dossier-tag">⚡ QUICK OVERVIEW</span>
            <span className="ai-dossier-badge">Interactive Highlights</span>
          </div>

          <div className="ai-topics-row">
            {topics.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`ai-topic-chip ${activeTopic === t.id ? "ai-topic-chip--active" : ""}`}
                onClick={() => setActiveTopic(t.id)}
                title={`View ${t.label} details`}
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
    </div>
  );
}
