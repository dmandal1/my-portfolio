import React from "react";
import "./StartupProjects.css";
import { bigProjects as defaultBigProjects } from "../../portfolio";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";

export default function StartupProject() {
  const data = usePortfolioData();
  const bigProjects = data?.projects || defaultBigProjects;

  function openProjectInNewWindow(url) {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win) { win.opener = null; win.focus(); }
  }

  return (
    <div className="main" id="projects">
      <div>
        <h1 className="skills-heading">{bigProjects.title}</h1>
        <p className="subTitle project-subtitle">{bigProjects.subtitle}</p>
        <div className="startup-projects-main">
          <div className="startup-project-text">
            {(bigProjects.projects || []).map((project, i) => (
              <div key={project.link || i} className="saaya-health-div" onClick={() => openProjectInNewWindow(project.link)}>
                <img alt={project.title || "Project"} src={project.image} />
              </div>
            ))}
          </div>
          <div className="starup-project-image" />
        </div>
      </div>
    </div>
  );
}
