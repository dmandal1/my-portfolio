import React from "react";
import "./Skills.css";
import SkillSection from "./SkillSection";
import { Fade } from "../../components/animations/Reveal";

export default function Skills(props) {
  const theme = props.theme;
  return (
    <div className="main" id="skills">
      <div className="skills-header-div">
        <Fade direction="up" duration={1000}>
          <div className="skills-pill-badge">
            <span className="skills-pill-icon">⚡</span>
            <span>ENGINEERING & CAPABILITIES</span>
          </div>
          <h1 className="skills-header" style={{ color: theme.text }}>
            What I Build & Engineer
          </h1>
          <p className="skills-header-sub" style={{ color: theme.secondaryText }}>
            Crafting scalable web architectures, resilient backend microservices, and high-performance interactive interfaces.
          </p>
        </Fade>
      </div>
      <SkillSection theme={theme} />
    </div>
  );
}
