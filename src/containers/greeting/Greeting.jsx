import React, { useState, useEffect } from "react";
import "./Greeting.css";
import SocialMedia from "../../components/socialMedia/SocialMedia";
import Button from "../../components/button/Button";
import { greeting as defaultGreeting } from "../../portfolio";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";
import { Fade } from "../../components/animations/Reveal";
import AiAvatarVideo from "../../components/aiAvatarVideo/AiAvatarVideo";

const DEFAULT_ROLES = [
  "Full Stack Developer",
  "React & Node.js Engineer",
  "Cloud & DevOps Architect",
  "API & Systems Specialist",
  "JavaScript & TypeScript Dev",
];

function useTypingEffect(words, typingSpeed = 90, deletingSpeed = 50, pauseMs = 1800) {
  const [displayed, setDisplayed] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIndex % words.length];
    let timeout;

    if (!isDeleting && displayed === current) {
      timeout = setTimeout(() => setIsDeleting(true), pauseMs);
    } else if (isDeleting && displayed === "") {
      setIsDeleting(false);
      setWordIndex((i) => i + 1);
    } else {
      const next = isDeleting
        ? current.slice(0, displayed.length - 1)
        : current.slice(0, displayed.length + 1);
      timeout = setTimeout(() => setDisplayed(next), isDeleting ? deletingSpeed : typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, wordIndex, words, typingSpeed, deletingSpeed, pauseMs]);

  return displayed;
}

export default function Greeting(props) {
  const theme = props.theme;
  const data = usePortfolioData();
  const greeting = data?.profile || defaultGreeting;

  /* roles: admin-configured (comma or newline separated) or hardcoded defaults */
  const roles = (() => {
    const raw = greeting.roles;
    if (typeof raw === "string" && raw.trim())
      return raw.split(/[\n,]/).map((r) => r.trim()).filter(Boolean);
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return DEFAULT_ROLES;
  })();

  const typedRole = useTypingEffect(roles);

  const scrollToAiVideo = () => {
    const el = document.getElementById("ai-avatar-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <Fade direction="up" duration={1200}>
      <div className="greet-main" id="greeting">
        {/* Background ambient light blobs */}
        <div className="greet-bg-blob greet-bg-blob--1" />
        <div className="greet-bg-blob greet-bg-blob--2" />

        <div className="greeting-main">
          {/* Left Column: Bio & Hero Content */}
          <div className="greeting-text-div">
            {/* Top Status & Welcome Badge */}
            <div className="hero-status-row">
              <span className="hero-badge">
                <span className="hero-badge-sparkle">✨</span>
                <span>Welcome to my digital space</span>
              </span>
              <span className="hero-available-badge">
                <span className="hero-available-dot" />
                <span>Available for work</span>
              </span>
            </div>

            {/* Name Heading with animated gradient shimmer */}
            <h1 className="greeting-text">
              {greeting.title}
            </h1>

            {/* Modern Interactive Role Pill */}
            <div className="hero-role-pill-wrapper">
              <div className="hero-role-pill">
                <span className="hero-role-symbol">&lt;/&gt;</span>
                <span className="typing-text">{typedRole}</span>
                <span className="typing-cursor">|</span>
              </div>
            </div>

            {/* Subtitle */}
            <p
              className="greeting-text-p subTitle"
              style={{ color: theme.secondaryText }}
            >
              {greeting.subTitle}
            </p>

            {/* Impact Metrics Bar */}
            <div className="hero-metrics-bar">
              <div className="hero-metric-item">
                <span className="hero-metric-num">5+</span>
                <span className="hero-metric-label">Years Exp</span>
              </div>
              <div className="hero-metric-divider" />
              <div className="hero-metric-item">
                <span className="hero-metric-num">25+</span>
                <span className="hero-metric-label">Projects</span>
              </div>
              <div className="hero-metric-divider" />
              <div className="hero-metric-item">
                <span className="hero-metric-num">15+</span>
                <span className="hero-metric-label">Production Apps</span>
              </div>
              <div className="hero-metric-divider" />
              <div className="hero-metric-item">
                <span className="hero-metric-num">100%</span>
                <span className="hero-metric-label">Commitment</span>
              </div>
            </div>

            {/* Action CTA Buttons */}
            <div className="hero-actions-group">
              <button
                type="button"
                className="hero-ai-intro-cta"
                onClick={scrollToAiVideo}
              >
                <span className="hero-ai-cta-icon">▶</span>
                <span>Watch AI Intro</span>
                <span className="hero-ai-cta-spark">AI</span>
              </button>

              <div className="portfolio-resume">
                <Button
                  text="See my resume"
                  newTab={true}
                  href={greeting.resumeLink}
                  theme={theme}
                  className="portfolio-repo-btn"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  }
                />
              </div>

              <a href="#/contact" className="hero-contact-btn">
                <span>Let's Talk</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </div>

            {/* Social Media Links */}
            <div className="hero-social-wrap">
              <SocialMedia theme={theme} />
            </div>
          </div>

          {/* Right Column: AI Avatar Hologram Video */}
          <div className="greeting-image-div" id="ai-avatar-section">
            <AiAvatarVideo theme={theme} />
          </div>
        </div>
      </div>
    </Fade>
  );
}
