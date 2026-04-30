import React, { Component } from "react";
import "./Header.css";
import { Fade } from "../animations/Reveal";
import { NavLink } from "react-router-dom";
import { greeting as defaultGreeting, settings } from "../../portfolio.js";
import SeoHeader from "../seoHeader/SeoHeader";
import { darkTheme } from "../../theme";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";

const PORTFOLIO_THEME_PREVIEW_EVENT = "portfolioThemePreviewUpdated";

class HeaderInner extends Component {
  handleThemeToggle = () => {
    const nextTheme = this.props.theme === darkTheme ? "light" : "dark";
    document.documentElement.setAttribute("data-portfolio-theme", nextTheme);
    window.dispatchEvent(new CustomEvent(PORTFOLIO_THEME_PREVIEW_EVENT, { detail: { theme: nextTheme } }));
  };

  render() {
    const { theme, logoName } = this.props;
    const isDarkMode = theme === darkTheme;
    const link = settings.isSplash ? "/splash" : "/home";
    return (
      <Fade direction="down" duration={1000}>
        <SeoHeader />
        <div>
          <header className="header">
            <NavLink to={link} className="logo">
              <span style={{ color: theme.text }}>&lt;</span>
              <span className="logo-name" style={{ color: theme.text }}>{logoName}</span>
              <span style={{ color: theme.text }}>/&gt;</span>
            </NavLink>
            <input className="menu-btn" type="checkbox" id="menu-btn" />
            <label className="menu-icon" htmlFor="menu-btn">
              <span className="navicon"></span>
            </label>
            <ul className="menu">
              {[
                { to: "/home",       label: "Home" },
                { to: "/education",  label: "Education" },
                { to: "/experience", label: "Experience" },
                { to: "/projects",   label: "Projects" },
                { to: "/blogs",      label: "Blogs" },
                { to: "/opensource", label: "Open Source" },
                { to: "/contact",    label: "Contact Me" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <NavLink to={to} style={({ isActive }) => ({ color: theme.text, fontWeight: isActive ? "bold" : "normal" })}>
                    {label}
                  </NavLink>
                </li>
              ))}
              <li className="theme-toggle-item">
                <button
                  type="button"
                  className="portfolio-theme-toggle"
                  onClick={this.handleThemeToggle}
                  aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                  title={isDarkMode ? "Light mode" : "Dark mode"}
                  style={{ color: theme.text, "--toggle-border": theme.cardBorder || theme.imageDark, "--toggle-bg": theme.cardBackground || theme.body }}
                >
                  <i className={isDarkMode ? "fas fa-sun" : "fas fa-moon"} />
                  <span className="theme-toggle-label">{isDarkMode ? "Light mode" : "Dark mode"}</span>
                </button>
              </li>
            </ul>
          </header>
        </div>
      </Fade>
    );
  }
}

export default function Header(props) {
  const data = usePortfolioData();
  const logoName = data?.profile?.logo_name || defaultGreeting.logo_name;
  return <HeaderInner {...props} logoName={logoName} />;
}
