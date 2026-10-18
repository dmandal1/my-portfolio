import React from "react";
import "./HomeContactCta.css";
import { Fade } from "../animations/Reveal";
import { Link } from "react-router-dom";
import { greeting as defaultGreeting } from "../../portfolio";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";

export default function HomeContactCta({ theme }) {
  const data = usePortfolioData();
  const resumeLink = data?.profile?.resumeLink || defaultGreeting.resumeLink;

  return (
    <section className="home-cta-section" id="home-cta">
      <Fade direction="up" duration={900}>
        <div className="home-cta-card">
          <div className="home-cta-glow home-cta-glow--1" />
          <div className="home-cta-glow home-cta-glow--2" />

          <div className="home-cta-content">
            <div className="home-cta-status-badge">
              <span className="home-cta-dot" />
              <span>Available for New Roles & High-Impact Projects</span>
            </div>

            <h2 className="home-cta-title">
              Let's Build Something Extraordinary Together.
            </h2>

            <p className="home-cta-subtitle" style={{ color: theme.secondaryText }}>
              Whether you need to scale enterprise backend architectures, design resilient microservices, or build modern full-stack web platforms, I'd love to connect.
            </p>

            <div className="home-cta-actions">
              <Link to="/contact" className="home-cta-btn home-cta-btn--primary">
                <span>Start a Conversation</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>

              {resumeLink && (
                <a
                  href={resumeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="home-cta-btn home-cta-btn--secondary"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download Resume</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </Fade>
    </section>
  );
}
