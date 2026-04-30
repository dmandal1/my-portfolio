import React from "react";
import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import TopButton from "../../components/topButton/TopButton";
import ExperienceAccordion from "../../containers/experienceAccordion/ExperienceAccordion";
import "./Experience.css";
import { experience as defaultExperience } from "../../portfolio.js";
import { Fade } from "../../components/animations/Reveal";
import ExperienceImg from "./ExperienceImg";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";

export default function Experience({ theme, onToggle }) {
  const data = usePortfolioData();

  const header = data?.experienceHeader || {
    title:       defaultExperience.title,
    subtitle:    defaultExperience.subtitle,
    description: defaultExperience.description,
  };
  const sections = data?.experiences ?? defaultExperience.sections;

  return (
    <div className="experience-main">
      <Header theme={theme} />

      <div className="exp-hero">
        <Fade direction="right" duration={1000}>
          <div className="exp-hero-text">
            <span
              className="exp-badge"
              style={{
                color: theme.imageHighlight,
                background: `${theme.imageHighlight}18`,
                border: `1px solid ${theme.imageHighlight}40`,
              }}
            >
              {header.subtitle}
            </span>

            <h1 className="exp-title" style={{ color: theme.text }}>
              {header.title}
            </h1>

            <div
              className="exp-title-bar"
              style={{
                background: `linear-gradient(90deg, ${theme.imageHighlight}, ${theme.gradientEnd || theme.highlight})`,
              }}
            />

            <p
              className="exp-description"
              style={{
                color: theme.secondaryText,
                borderLeft: `3px solid ${theme.imageHighlight}`,
              }}
            >
              {header.description}
            </p>

            {header.stats?.length > 0 && (
              <div className="exp-stats">
                {header.stats.map((stat, i) => (
                  <div
                    key={i}
                    className="exp-stat"
                    style={{
                      borderColor: `${theme.imageHighlight}30`,
                      background: `${theme.imageHighlight}08`,
                    }}
                  >
                    <span className="exp-stat-value" style={{ color: theme.imageHighlight }}>
                      {stat.value}
                    </span>
                    <span className="exp-stat-label" style={{ color: theme.secondaryText }}>
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Fade>

        <Fade direction="left" duration={1000}>
          <div className="exp-hero-img">
            <ExperienceImg theme={theme} />
          </div>
        </Fade>
      </div>

      <ExperienceAccordion sections={sections} theme={theme} />
      <Footer theme={theme} onToggle={onToggle} />
      <TopButton theme={theme} />
    </div>
  );
}
