import React, { Component } from "react";
import Header from "../../components/header/Header";
import Greeting from "../../containers/greeting/Greeting";
import TechStackMarquee from "../../components/techStackMarquee/TechStackMarquee";
import Skills from "../../containers/skills/Skills";
import FeaturedProjects from "../../components/featuredProjects/FeaturedProjects";
import HomeExperience from "../../components/homeExperience/HomeExperience";
import HomeContactCta from "../../components/homeContactCta/HomeContactCta";
import Footer from "../../components/footer/Footer";
import TopButton from "../../components/topButton/TopButton";
import ParticlesBackground from "../../components/animations/ParticlesBackground";

class Home extends Component {
  render() {
    const { theme } = this.props;
    return (
      <div style={{ position: "relative", minHeight: "100vh" }}>
        <ParticlesBackground theme={theme} />
        <Header theme={theme} />
        <main>
          <Greeting theme={theme} />
          <TechStackMarquee theme={theme} />
          <Skills theme={theme} />
          <FeaturedProjects theme={theme} />
          <HomeExperience theme={theme} />
          <HomeContactCta theme={theme} />
        </main>
        <Footer theme={theme} />
        <TopButton theme={theme} />
      </div>
    );
  }
}

export default Home;
