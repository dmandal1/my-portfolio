import React, { Component } from "react";
import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import TopButton from "../../components/topButton/TopButton";
import Educations from "../../containers/education/Educations";
import Certifications from "../../containers/certifications/Certifications";
import CompetitiveSites from "../../components/competitiveSites/CompetitiveSites";
import EducationImg from "./EducationImg";
import { competitiveSites as defaultCompetitiveSites } from "../../portfolio";
import "./EducationComponent.css";
import { Fade } from "../../components/animations/Reveal";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";

class EducationInner extends Component {
  render() {
    const { theme, competitiveSites } = this.props;
    return (
      <div className="education-main">
        <Header theme={theme} />
        <div className="basic-education">
          <Fade direction="up" duration={2000}>
            <div className="heading-div">
              <div className="heading-img-div">
                <EducationImg theme={theme} />
              </div>
              <div className="heading-text-div">
                <h1 className="heading-text" style={{ color: theme.text }}>
                  Education
                </h1>
                <h3 className="heading-sub-text" style={{ color: theme.text }}>
                  Basic Qualification and Certifcations
                </h3>
                <CompetitiveSites logos={competitiveSites} theme={theme} />
              </div>
            </div>
          </Fade>
          <Educations theme={theme} />
          <Certifications theme={theme} />
        </div>
        <Footer theme={theme} />
        <TopButton theme={theme} />
      </div>
    );
  }
}

export default function Education(props) {
  const data = usePortfolioData();
  const competitiveSites = data?.competitiveSites || defaultCompetitiveSites.competitiveSites;
  return <EducationInner {...props} competitiveSites={competitiveSites} />;
}
