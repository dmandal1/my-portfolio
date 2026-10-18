import React, { useState, useEffect, useRef } from "react";
import "./AiAvatarVideo.css";

const INTRO_TRANSCRIPT = "Hi! I'm Deepak Mandal. Full Stack Developer & Cloud Architect. Welcome to my portfolio — explore my projects, skills, and let's build something amazing together!";

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
  const [isTheaterOpen, setIsTheaterOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState("intro");
  const [isHovered, setIsHovered] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);

  // Fallback AI Speech Synthesizer for 100% audio guarantee across all browsers/phones
  const speakAiVoice = (customText) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const textToSpeak = customText || INTRO_TRANSCRIPT;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Google") ||
            v.name.includes("Daniel") ||
            v.name.includes("Alex") ||
            v.name.includes("Samantha"))
      );
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onstart = () => setIsNarrating(true);
      utterance.onend = () => setIsNarrating(false);
      utterance.onerror = () => setIsNarrating(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
    }
  };

  const stopAiVoice = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsNarrating(false);
  };

  // Start with audio enabled (triggered by user click)
  const playWithSound = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    // Reset and enable sound
    video.currentTime = 0;
    video.muted = false;
    video.volume = 1.0;
    setIsMuted(false);
    setHasSoundStarted(true);
    setIsEnded(false);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn("Browser blocked audio play; activating AI speech narration fallback:", err);
          // If browser policy blocked video audio track, narrate seamlessly!
          speakAiVoice();
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        });
    }
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

    // Listen for custom event from hero "Watch AI Intro" button
    const onHeroVoiceTrigger = () => {
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      playWithSound();
    };

    window.addEventListener("playAiAvatarVoice", onHeroVoiceTrigger);
    return () => {
      window.removeEventListener("playAiAvatarVoice", onHeroVoiceTrigger);
      stopAiVoice();
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
      stopAiVoice();
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
    } else {
      stopAiVoice();
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

  // Close theater on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setIsTheaterOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const topics = [
    {
      id: "intro",
      icon: "👋",
      label: "Intro Tour",
      text: "Hi, I'm Deepak Mandal! Full Stack Software Developer & Cloud Architect with 5+ years of experience.",
      speech: "Hello! I am Deepak Mandal, a Full Stack Developer and Cloud Engineer. Welcome to my portfolio!"
    },
    {
      id: "stack",
      icon: "⚡",
      label: "Tech Stack",
      text: "Expert in React, Node.js, TypeScript, Next.js, PostgreSQL, Docker, and Cloud Native Architectures.",
      speech: "My core stack includes React, Node.js, TypeScript, Next.js, and modern cloud architectures."
    },
    {
      id: "work",
      icon: "🚀",
      label: "Open to Work",
      text: "Actively available for high-impact full-time engineering roles, technical leadership, and contract collaborations.",
      speech: "I am actively available for high-impact engineering roles, contract collaborations, and technical leadership."
    }
  ];

  const handleTopicClick = (t) => {
    setActiveTopic(t.id);
    speakAiVoice(t.speech);
  };

  const isAudioActive = (!isMuted && isPlaying) || isNarrating;

  return (
    <div
      ref={containerRef}
      className="ai-avatar-card-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Outer ambient glow */}
      <div className={`ai-ambient-glow ${isAudioActive ? "ai-ambient-glow--active" : ""}`} />

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
            {/* Live Audio Spectrum Visualizer */}
            <div
              className={`ai-audio-wave ${isAudioActive ? "ai-audio-wave--active" : ""}`}
              title={isAudioActive ? "Voice Audio is Playing" : "Audio Muted"}
            >
              <span className="wave-bar b1" />
              <span className="wave-bar b2" />
              <span className="wave-bar b3" />
              <span className="wave-bar b4" />
              <span className="wave-bar b5" />
            </div>

            {/* AI Speech Narrator Button */}
            <button
              type="button"
              className={`ai-narrate-btn ${isNarrating ? "ai-narrate-btn--active" : ""}`}
              onClick={() => (isNarrating ? stopAiVoice() : speakAiVoice())}
              title={isNarrating ? "Stop Voice Narration" : "Listen to AI Voice Narration"}
              aria-label="Listen to AI Voice Narration"
            >
              <span className="ai-narrate-icon">🎙️</span>
              <span className="ai-narrate-text">{isNarrating ? "Stop" : "AI Voice"}</span>
            </button>

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

          {/* Prominent Center Play Button when Muted or Paused */}
          {(!hasSoundStarted || isMuted || !isPlaying || isEnded) && (
            <div className="ai-center-overlay" onClick={playWithSound}>
              <div className="ai-play-pulse-ring" />
              <button
                type="button"
                className="ai-play-center-btn"
                aria-label={isEnded ? "Replay AI Introduction" : "Play AI Introduction with Sound"}
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
                <span className="sound-pulse-icon">🔊</span>
                <span>{isEnded ? "Replay with Sound" : "Click to Play with AI Voice"}</span>
              </div>
            </div>
          )}

          {/* Live Captions / Subtitles Overlay */}
          {isPlaying && (
            <div className="ai-captions-overlay">
              <span className="ai-caption-tag">● AI VOICE</span>
              <p className="ai-caption-text">
                "Hi! I'm Deepak Mandal — Full Stack Developer & Cloud Architect. Welcome to my portfolio!"
              </p>
            </div>
          )}

          {/* Bottom Floating Glass HUD Controls */}
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
                  aria-label={isMuted ? "Unmute Voice" : "Mute Voice"}
                  title={isMuted ? "Unmute Voice" : "Mute Voice"}
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
            <span className="ai-dossier-badge">Interactive Audio</span>
          </div>

          <div className="ai-topics-row">
            {topics.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`ai-topic-chip ${activeTopic === t.id ? "ai-topic-chip--active" : ""}`}
                onClick={() => handleTopicClick(t)}
                title={`Listen to ${t.label} Voice Brief`}
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
                  <span className="ai-theater-verified">Verified Voice</span>
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
                  <button
                    type="button"
                    className="ai-theater-cta-primary"
                    onClick={() => speakAiVoice()}
                  >
                    🔊 Play Voice Narration
                  </button>
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
