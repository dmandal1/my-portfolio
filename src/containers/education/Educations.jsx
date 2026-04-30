import React from "react";
import "./Educations.css";
import DegreeCard from "../../components/degreeCard/DegreeCard";
import { degrees as defaultDegrees } from "../../portfolio";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";
import { Fade } from "../../components/animations/Reveal";

export default function Educations({ theme }) {
  const data = usePortfolioData();
  const degrees = data?.degrees || defaultDegrees.degrees;

  return (
    <div className="main" id="educations">
      <div className="educations-header-div">
        <Fade direction="up" duration={2000}>
          <h1 className="educations-header" style={{ color: theme.text }}>
            Degrees Received
          </h1>
        </Fade>
      </div>
      <div className="educations-body-div">
        {degrees.map((degree) => (
          <DegreeCard key={degree.id || degree.title} degree={degree} theme={theme} />
        ))}
      </div>
    </div>
  );
}
