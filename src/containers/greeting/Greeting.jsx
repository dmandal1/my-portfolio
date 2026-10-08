import React, { useState, useEffect, useRef } from "react";
import "./Greeting.css";
import SocialMedia from "../../components/socialMedia/SocialMedia";
import Button from "../../components/button/Button";
import { greeting as defaultGreeting } from "../../portfolio";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";
import { Fade } from "../../components/animations/Reveal";
// import FeelingProud from "./FeelingProud"; // Replaced by video

const DEFAULT_ROLES = [
  "Full Stack Developer",
  "React.js Engineer",
  "Node.js Developer",
  "JavaScript Enthusiast",
  "Programmer",
];

function useTypingEffect(words, typingSpeed = 100, deletingSpeed = 60, pauseMs = 1500) {
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

  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      // Force mute initially to ensure autoplay works
      videoRef.current.muted = true;
      videoRef.current.play().catch(e => console.warn("Autoplay blocked", e));
    }
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <Fade direction="up" duration={2000}>
      <div className="greet-main" id="greeting">
        <div className="greeting-main">
          <div className="greeting-text-div">
            <div>
              <h1 className="greeting-text" style={{ color: theme.text }}>
                {greeting.title}
              </h1>
              <h2 className="greeting-job_profile" style={{ color: theme.text }}>
                ( <span className="typing-text">{typedRole}</span><span className="typing-cursor">|</span> )
              </h2>
              <p
                className="greeting-text-p subTitle"
                style={{ color: theme.secondaryText }}
              >
                {greeting.subTitle}
              </p>
              <SocialMedia theme={theme} />
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
            </div>
          </div>
          <div className="greeting-image-div" style={{ 
            position: "relative", 
            width: "100%", 
            maxWidth: "500px", 
            aspectRatio: "768/960", 
            margin: "0 auto"
          }}>
            <video 
              ref={videoRef}
              src="/intro.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline
              style={{ 
                width: "100%", 
                height: "100%", 
                objectFit: "cover",
                pointerEvents: "none",
                filter: "none" // removes the drop-shadow from Greeting.css which blocks transparency
              }}
            />
            <button 
              onClick={toggleMute}
              style={{
                position: "absolute",
                bottom: "24px",
                right: "24px",
                background: theme.text,
                color: theme.body,
                border: "none",
                borderRadius: "50%",
                width: "48px",
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                zIndex: 20,
                transition: "transform 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              title={isMuted ? "Unmute Video" : "Mute Video"}
            >
              <i className={isMuted ? "fas fa-volume-mute" : "fas fa-volume-up"} style={{ fontSize: "20px" }} />
            </button>
          </div>
        </div>
      </div>
    </Fade>
  );
}
