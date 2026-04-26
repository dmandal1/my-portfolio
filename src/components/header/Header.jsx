import React, { Component } from "react";
import "./Header.css";
import { Fade } from "../animations/Reveal";
import { NavLink } from "react-router-dom";
import { greeting, settings } from "../../portfolio.js";
import SeoHeader from "../seoHeader/SeoHeader";
import { darkTheme } from "../../theme";

const PORTFOLIO_THEME_PREVIEW_EVENT = "portfolioThemePreviewUpdated";

class Header extends Component {
  handleThemeToggle = () => {
    const nextTheme = this.props.theme === darkTheme ? "light" : "dark";

    // Set data-portfolio-theme synchronously so CSS transitions start immediately,
    // before React re-renders and updates inline styles on the next frame.
    document.documentElement.setAttribute("data-portfolio-theme", nextTheme);
    document.documentElement.setAttribute("data-admin-theme", nextTheme);
    window.dispatchEvent(
      new CustomEvent(PORTFOLIO_THEME_PREVIEW_EVENT, {
        detail: { theme: nextTheme },
      }),
    );
  };

  render() {
    const theme = this.props.theme;
    const isDarkMode = theme === darkTheme;
    const link = settings.isSplash ? "/splash" : "/home";
    return (
      <Fade direction="down" duration={1000}>
        <SeoHeader />
        <div>
          <header className="header">
            <NavLink to={link} className="logo">
              <span style={{ color: theme.text }}> &lt;</span>
              <span className="logo-name" style={{ color: theme.text }}>
                {greeting.logo_name}
              </span>
              <span style={{ color: theme.text }}>/&gt;</span>
            </NavLink>
            <input className="menu-btn" type="checkbox" id="menu-btn" />
            <label className="menu-icon" htmlFor="menu-btn">
              <span className="navicon"></span>
            </label>
            <ul className="menu">
              <li>
                <NavLink
                  to="/home"
                  style={({ isActive }) => ({
                    color: theme.text,
                    fontWeight: isActive ? "bold" : "normal",
                  })}
                >
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/education"
                  style={({ isActive }) => ({
                    color: theme.text,
                    fontWeight: isActive ? "bold" : "normal",
                  })}
                >
                  Education
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/experience"
                  style={({ isActive }) => ({
                    color: theme.text,
                    fontWeight: isActive ? "bold" : "normal",
                  })}
                >
                  Experience
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/projects"
                  style={({ isActive }) => ({
                    color: theme.text,
                    fontWeight: isActive ? "bold" : "normal",
                  })}
                >
                  Projects
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/blogs"
                  style={({ isActive }) => ({
                    color: theme.text,
                    fontWeight: isActive ? "bold" : "normal",
                  })}
                >
                  Blogs
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/opensource"
                  style={({ isActive }) => ({
                    color: theme.text,
                    fontWeight: isActive ? "bold" : "normal",
                  })}
                >
                  Open Source
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/contact"
                  style={({ isActive }) => ({
                    color: theme.text,
                    fontWeight: isActive ? "bold" : "normal",
                  })}
                >
                Contact Me
                </NavLink>
              </li>
              <li className="theme-toggle-item">
                <button
                  type="button"
                  className="portfolio-theme-toggle"
                  onClick={this.handleThemeToggle}
                  aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                  title={isDarkMode ? "Light mode" : "Dark mode"}
                  style={{
                    color: theme.text,
                    "--toggle-border": theme.cardBorder || theme.imageDark,
                    "--toggle-bg": theme.cardBackground || theme.body,
                  }}
                >
                  <i className={isDarkMode ? "fas fa-sun" : "fas fa-moon"} />
                  <span className="theme-toggle-label">
                    {isDarkMode ? "Light mode" : "Dark mode"}
                  </span>
                </button>
              </li>
            </ul>
          </header>
        </div>
      </Fade>
    );
  }
}
export default Header;
