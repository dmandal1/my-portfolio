import React, { useState } from "react";
import ExperienceCard from "../../components/experienceCard/ExperienceCard";
import "./ExperienceAccordion.css";

const SECTION_META = {
  Work:          { color: "#1565C0", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg> },
  Internships:   { color: "#7B1FA2", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
  Volunteerships:{ color: "#C62828", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
};

function ChevronIcon({ open }) {
  return (
    <svg className={`tl-chevron ${open ? "open" : ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function TimelineSection({ section, theme }) {
  const [open, setOpen] = useState(true);
  const meta = SECTION_META[section.title] || SECTION_META["Work"];

  return (
    <div className="tl-section">
      {/* Section header */}
      <button className="tl-section-btn" onClick={() => setOpen(!open)} style={{ color: theme.text }}>
        <span className="tl-section-icon" style={{ background: `linear-gradient(135deg, ${meta.color}dd, ${meta.color}88)` }}>
          {meta.icon}
        </span>
        <span className="tl-section-title">{section.title}</span>
        <span className="tl-section-pill" style={{ color: meta.color, background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
          {section.experiences.length} {section.experiences.length === 1 ? "role" : "roles"}
        </span>
        <span className="tl-section-rule" style={{ background: `linear-gradient(90deg, ${meta.color}50, transparent)` }} />
        <ChevronIcon open={open} />
      </button>

      {/* Collapsible entries */}
      <div className={`tl-entries-wrap ${open ? "tl-open" : ""}`}>
        <div className="tl-entries">
          {/* Vertical line */}
          <div className="tl-line" style={{ background: `linear-gradient(180deg, ${meta.color} 0%, ${meta.color}44 70%, transparent 100%)` }} />

          {section.experiences.map((exp, i) => {
            const isCurrent = exp.duration.toLowerCase().includes("present");
            return (
              <div className="tl-entry" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                {/* Dot */}
                <div className="tl-dot-col">
                  <div
                    className={`tl-dot ${isCurrent ? "tl-dot-active" : ""}`}
                    style={{ background: exp.color, boxShadow: `0 0 0 4px ${exp.color}25` }}
                  >
                    {isCurrent && <span className="tl-dot-pulse" style={{ borderColor: exp.color }} />}
                  </div>
                </div>

                {/* Card */}
                <div className="tl-card-wrap">
                  <ExperienceCard experience={exp} theme={theme} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ExperienceAccordion({ sections, theme }) {
  return (
    <div className="tl-container">
      {sections.map((section) => (
        <TimelineSection key={section.title} section={section} theme={theme} />
      ))}
    </div>
  );
}
