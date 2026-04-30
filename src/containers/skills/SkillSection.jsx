import React from "react";
import "./Skills.css";
import SoftwareSkill from "../../components/softwareSkills/SoftwareSkill";
import { skills as defaultSkills } from "../../portfolio";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";
import { Fade } from "../../components/animations/Reveal";
import DataScienceImg from "./DataScienceImg";
import FullStackImg from "./FullStackImg";
import CloudInfraImg from "./CloudInfraImg";
import DesignImg from "./DesignImg";

function GetSkillSvg({ fileName, theme }) {
  if (fileName === "DataScienceImg") return <DataScienceImg theme={theme} />;
  if (fileName === "FullStackImg")   return <FullStackImg theme={theme} />;
  if (fileName === "CloudInfraImg")  return <CloudInfraImg theme={theme} />;
  return <DesignImg theme={theme} />;
}

export default function SkillSection({ theme }) {
  const data = usePortfolioData();
  const skillGroups = data?.skills || defaultSkills.data;

  return (
    <div>
      {skillGroups.map((skill) => (
        <div key={skill.title} className="skills-main-div">
          <Fade direction="right" duration={2000}>
            <div className="skills-image-div">
              <GetSkillSvg fileName={skill.fileName} theme={theme} />
            </div>
          </Fade>
          <div className="skills-text-div">
            <Fade direction="left" duration={1000}>
              <h1 className="skills-heading" style={{ color: theme.text }}>{skill.title}</h1>
            </Fade>
            <Fade direction="left" duration={1500}>
              <SoftwareSkill logos={skill.softwareSkills} theme={theme} />
            </Fade>
            <Fade direction="left" duration={2000}>
              <div>
                {(skill.skills || []).map((sentence) => (
                  <p key={sentence} className="subTitle skills-text" style={{ color: theme.secondaryText }}>
                    {sentence}
                  </p>
                ))}
              </div>
            </Fade>
          </div>
        </div>
      ))}
    </div>
  );
}
