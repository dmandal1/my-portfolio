import React from "react";
import "./HomeExperience.css";
import { Fade } from "../animations/Reveal";
import { Link } from "react-router-dom";
import { experience as defaultExperience } from "../../portfolio";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";

const imageModules = import.meta.glob("../../assests/images/**/*.{png,jpg,jpeg,svg,webp}", { eager: true });
function getImage(filename) {
  if (!filename) return "";
  if (filename.startsWith("http") || filename.startsWith("/")) return filename;
  const key = `../../assests/images/${filename}`;
  return imageModules[key]?.default ?? filename;
}

export default function HomeExperience({ theme }) {
  const data = usePortfolioData();
  const workSection = (data?.experience?.sections || defaultExperience.sections).find(
    (s) => s.title.toLowerCase().includes("work")
  );
  const experiences = (workSection?.experiences || []).slice(0, 3);

  return (
    <section className="home-exp-section" id="career-highlights">
      <Fade direction="up" duration={900}>
        <div className="section-header-block">
          <div className="section-pill-tag">
            <span>💼</span>
            <span>EXPERIENCE & LEADERSHIP</span>
          </div>
          <h2 className="section-main-heading">Career Highlights</h2>
          <p className="section-sub-heading" style={{ color: theme.secondaryText }}>
            Engineering scalable backend microservices, resilient APIs, and enterprise cloud solutions.
          </p>
        </div>
      </Fade>

      <div className="home-exp-timeline">
        {experiences.map((exp, idx) => {
          const isCurrent = exp.duration.toLowerCase().includes("present");
          return (
            <Fade key={`${exp.company}-${idx}`} direction="up" duration={800} delay={idx * 150}>
              <div className="home-exp-card">
                <div className="home-exp-header">
                  <div className="home-exp-company-block">
                    {exp.logo_path && (
                      <div className="home-exp-logo-wrap">
                        <img
                          src={getImage(exp.logo_path)}
                          alt={`${exp.company} logo`}
                          className="home-exp-logo"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="home-exp-role">{exp.title}</h3>
                      <h4 className="home-exp-company">
                        {exp.company_url ? (
                          <a
                            href={exp.company_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="home-exp-company-link"
                          >
                            {exp.company}
                          </a>
                        ) : (
                          exp.company
                        )}
                      </h4>
                    </div>
                  </div>

                  <div className="home-exp-badge-wrap">
                    <span className={`home-exp-date-badge ${isCurrent ? "home-exp-date-badge--current" : ""}`}>
                      {isCurrent && <span className="home-exp-pulse-dot" />}
                      <span>{exp.duration}</span>
                    </span>
                  </div>
                </div>

                <p className="home-exp-desc" style={{ color: theme.secondaryText }}>
                  {exp.description}
                </p>

                <div className="home-exp-meta">
                  <span className="home-exp-location">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{exp.location}</span>
                  </span>
                </div>
              </div>
            </Fade>
          );
        })}
      </div>

      <div className="home-exp-bottom-cta">
        <Link to="/experience" className="home-exp-view-all-btn">
          <span>View Complete Career Trajectory</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
