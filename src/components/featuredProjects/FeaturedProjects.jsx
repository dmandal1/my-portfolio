import React from "react";
import "./FeaturedProjects.css";
import { Fade } from "../animations/Reveal";
import { Link } from "react-router-dom";
import projectsData from "../../shared/opensource/projects.json";

const FEATURED_PROJECTS_META = {
  "cloudcraftz-application": {
    badge: "Backend & Cloud Architecture",
    badgeColor: "#0EA5E9",
    featured: true,
  },
  "ipod-react": {
    badge: "Interactive UI & Audio",
    badgeColor: "#8B5CF6",
    featured: true,
  },
  "Emotion-detection": {
    badge: "Machine Learning / AI",
    badgeColor: "#10B981",
    featured: true,
  },
  "StudentRegistration": {
    badge: "Systems & Data Management",
    badgeColor: "#F59E0B",
    featured: true,
  },
};

export default function FeaturedProjects({ theme }) {
  const projects = (projectsData.data || [])
    .filter((p) => FEATURED_PROJECTS_META[p.name])
    .slice(0, 4);

  return (
    <section className="featured-projects-section" id="featured-projects">
      <Fade direction="up" duration={900}>
        <div className="section-header-block">
          <div className="section-pill-tag">
            <span>✨</span>
            <span>FEATURED WORK</span>
          </div>
          <h2 className="section-main-heading">Spotlight Projects</h2>
          <p className="section-sub-heading" style={{ color: theme.secondaryText }}>
            A curated selection of production APIs, intelligent applications, and interactive web tools.
          </p>
        </div>
      </Fade>

      <div className="featured-projects-grid">
        {projects.map((proj, idx) => {
          const meta = FEATURED_PROJECTS_META[proj.name] || {};
          return (
            <Fade key={proj.id} direction="up" duration={800} delay={idx * 150}>
              <div className="featured-project-card">
                <div className="fp-card-top">
                  <span
                    className="fp-badge"
                    style={{
                      background: `${meta.badgeColor}18`,
                      borderColor: `${meta.badgeColor}40`,
                      color: meta.badgeColor,
                    }}
                  >
                    {meta.badge}
                  </span>
                  <a
                    href={proj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fp-github-link"
                    title="View GitHub Repository"
                    aria-label={`View ${proj.name} on GitHub`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                    </svg>
                  </a>
                </div>

                <h3 className="fp-title">{proj.name}</h3>
                <p className="fp-description" style={{ color: theme.secondaryText }}>
                  {proj.description}
                </p>

                <div className="fp-languages">
                  {(proj.languages || []).map((lang) => (
                    <span key={lang.name} className="fp-lang-pill">
                      <span className="fp-lang-dot" />
                      <span>{lang.name}</span>
                    </span>
                  ))}
                </div>

                <div className="fp-card-footer">
                  <a
                    href={proj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fp-action-btn"
                  >
                    <span>Inspect Code</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="7 7 17 7 17 17" />
                    </svg>
                  </a>
                </div>
              </div>
            </Fade>
          );
        })}
      </div>

      <div className="fp-bottom-cta">
        <Link to="/projects" className="fp-view-all-btn">
          <span>Explore All Projects & Architecture</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
