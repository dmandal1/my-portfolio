import React, { Component } from "react";
import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import TopButton from "../../components/topButton/TopButton";
import ExperienceAccordion from "../../containers/experienceAccordion/ExperienceAccordion";
import "./Experience.css";
import { experience } from "../../portfolio.js";
import { Fade } from "../../components/animations/Reveal";
import ExperienceImg from "./ExperienceImg";

class Experience extends Component {
  render() {
    const theme = this.props.theme;
    return (
      <div className="experience-main">
        <Header theme={theme} />

        <div className="exp-hero">
          {/* ── Text side ── */}
          <Fade direction="right" duration={1000}>
            <div className="exp-hero-text">

              {/* Badge */}
              <span
                className="exp-badge"
                style={{
                  color: theme.imageHighlight,
                  background: `${theme.imageHighlight}18`,
                  border: `1px solid ${theme.imageHighlight}40`,
                }}
              >
                {experience.subtitle}
              </span>

              {/* Title */}
              <h1 className="exp-title" style={{ color: theme.text }}>
                {experience.title}
              </h1>

              {/* Accent underline */}
              <div
                className="exp-title-bar"
                style={{
                  background: `linear-gradient(90deg, ${theme.imageHighlight}, ${theme.gradientEnd || theme.highlight})`,
                }}
              />

              {/* Description */}
              <p
                className="exp-description"
                style={{
                  color: theme.secondaryText,
                  borderLeft: `3px solid ${theme.imageHighlight}`,
                }}
              >
                {experience.description}
              </p>

              {/* Stats row */}
              <div className="exp-stats">
                {[
                  { value: "4+", label: "Years Experience" },
                  { value: "3+", label: "Companies" },
                  { value: "10+", label: "Projects Built" },
                ].map((stat, i) => (
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

            </div>
          </Fade>

          {/* ── Image side ── */}
          <Fade direction="left" duration={1000}>
            <div className="exp-hero-img">
              <ExperienceImg theme={theme} />
            </div>
          </Fade>
        </div>

        <ExperienceAccordion sections={experience["sections"]} theme={theme} />
        <Footer theme={this.props.theme} onToggle={this.props.onToggle} />
        <TopButton theme={this.props.theme} />
      </div>
    );
  }
}

export default Experience;
