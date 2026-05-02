import React from "react";
import "./Footer.css";
import { Fade } from "../animations/Reveal";
import { greeting as defaultGreeting, socialMediaLinks as defaultSocialLinks } from "../../portfolio.js";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";
import styled from "styled-components";

const IconWrapper = styled.span`
  i { background-color: ${(props) => props.$backgroundColor}; }
  &:hover i {
    background-color: ${(props) => props.theme.imageHighlight};
    transition: 0.3s ease-in;
  }
`;

export default function Footer(props) {
  const { theme } = props;
  const data = usePortfolioData();
  const greeting = data?.profile || defaultGreeting;
  const socialMediaLinks = data?.socialLinks || defaultSocialLinks;
  const year = new Date().getFullYear();
  const apiBase = import.meta.env.VITE_API_URL || "/api";

  const cssVars = {
    "--ft-body":    theme.body,
    "--ft-text":    theme.text,
    "--ft-sub":     theme.secondaryText,
    "--ft-accent":  theme.imageHighlight,
    "--ft-accent2": theme.gradientEnd || theme.highlight,
  };

  return (
    <footer className="ft-root" style={{ ...cssVars, backgroundColor: theme.body, transition: "background-color 0.25s linear" }}>

      <div className="ft-wave-box" aria-hidden="true">
        <div className="ft-wave-track ft-track-slow">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
            <path d="M0,30 C240,55 480,5 720,30 C960,55 1200,5 1440,30 L1440,60 L0,60 Z" fill={theme.imageHighlight} opacity="0.12" />
          </svg>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
            <path d="M0,30 C240,55 480,5 720,30 C960,55 1200,5 1440,30 L1440,60 L0,60 Z" fill={theme.imageHighlight} opacity="0.12" />
          </svg>
        </div>
        <div className="ft-wave-track ft-track-fast">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
            <path d="M0,42 C200,12 400,55 600,38 C800,20 1100,52 1440,35 L1440,60 L0,60 Z" fill={theme.imageHighlight} opacity="0.08" />
          </svg>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
            <path d="M0,42 C200,12 400,55 600,38 C800,20 1100,52 1440,35 L1440,60 L0,60 Z" fill={theme.imageHighlight} opacity="0.08" />
          </svg>
        </div>
      </div>

      <div className="ft-content">
        <Fade direction="up" duration={700}>
          <div className="ft-brand">
            <span className="ft-name">{greeting.logo_name}</span>
            <p className="ft-tagline" style={{ color: theme.secondaryText }}>{greeting.job_profile}</p>
          </div>
        </Fade>

        <Fade direction="up" duration={700} delay={100}>
          <div className="ft-social">
            {socialMediaLinks.map((media, i) => (
              <a key={i} href={media.link} className="ft-icon-btn" target="_blank" rel="noopener noreferrer" aria-label={media.name} title={media.name} style={{ "--glow": media.backgroundColor }}>
                <IconWrapper $backgroundColor={media.backgroundColor}>
                  <i className={`fab ${media.fontAwesomeIcon}`} />
                </IconWrapper>
              </a>
            ))}
          </div>
        </Fade>

        <Fade direction="up" duration={700} delay={180}>
          <div className="ft-divider" />
          <p className="ft-credit" style={{ color: theme.secondaryText }}>
            Made with <span className="ft-heart" role="img" aria-label="love">❤️</span>{" by "}
            <span className="ft-credit-name" style={{ color: theme.text }}>{greeting.title}</span>
            <span className="ft-year" style={{ color: theme.imageHighlight }}>{" · © "}{year}</span>
            <span className="ft-sep" style={{ color: theme.secondaryText, opacity: 0.4, margin: "0 8px" }}>|</span>
            <a href={`${apiBase}/sitemap.php`} target="_blank" rel="noopener noreferrer" className="ft-sitemap-link" style={{ color: theme.secondaryText, fontSize: 12, textDecoration: "none" }}>Sitemap</a>
            <span className="ft-sep" style={{ color: theme.secondaryText, opacity: 0.4, margin: "0 8px" }}>|</span>
            <a href={`${apiBase}/rss.php`} target="_blank" rel="noopener noreferrer" className="ft-sitemap-link" title="RSS Feed" style={{ color: theme.secondaryText, fontSize: 12, textDecoration: "none" }}><i className="fas fa-rss" style={{ fontSize: 10, marginRight: 4 }} />RSS Feed</a>
          </p>
        </Fade>
      </div>
    </footer>
  );
}
