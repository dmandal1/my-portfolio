import React, { Component } from "react";
import Header from "../../components/header/Header";
import Greeting from "../../containers/greeting/Greeting";
import Skills from "../../containers/skills/Skills";
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
          <Skills theme={theme} />
        </main>
        <Footer theme={theme} />
        <TopButton theme={theme} />
      </div>
    );
  }
}

export default Home;
