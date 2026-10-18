import React, { Component } from "react";
import "./Header.css";
import { Fade } from "../animations/Reveal";
import { NavLink } from "react-router-dom";
import { greeting as defaultGreeting, settings } from "../../portfolio.js";
import SeoHeader from "../seoHeader/SeoHeader";
import { darkTheme } from "../../theme";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";
import { useLanguage } from "../../contexts/LanguageContext";

const PORTFOLIO_THEME_PREVIEW_EVENT = "portfolioThemePreviewUpdated";

class HeaderInner extends Component {
  handleThemeToggle = () => {
    const nextTheme = this.props.theme === darkTheme ? "light" : "dark";
    document.documentElement.setAttribute("data-portfolio-theme", nextTheme);
    window.dispatchEvent(new CustomEvent(PORTFOLIO_THEME_PREVIEW_EVENT, { detail: { theme: nextTheme } }));
  };

  closeMenu = () => {
    const el = document.getElementById("menu-btn");
    if (el) el.checked = false;
  };

  handleHireMeClick = (e) => {
    this.closeMenu();
    window.location.hash = "#/contact";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  render() {
    const { theme, logoName, t } = this.props;
    const isDarkMode = theme === darkTheme;
    const link = settings.isSplash ? "/splash" : "/home";

    return (
      <Fade direction="down" duration={800}>
        <SeoHeader />
        <div className="header-outer">
          <header className="header">
            <NavLink to={link} className="logo" aria-label="Home" onClick={this.closeMenu}>
              <span className="logo-bracket">&lt;</span>
              <span className="logo-name">{logoName}</span>
              <span className="logo-bracket">/&gt;</span>
              <span className="logo-status-dot" title="Available for work" />
            </NavLink>

            <input className="menu-btn" type="checkbox" id="menu-btn" />
            <label className="menu-icon" htmlFor="menu-btn" aria-label="Toggle Menu">
              <span className="navicon"></span>
            </label>

            <ul className="menu">
              {(this.props.menuLinks || []).map(({ to, label }) => {
                let key = "nav.home";
                if (to === "/education") key = "nav.education";
                else if (to === "/experience") key = "nav.experience";
                else if (to === "/projects") key = "nav.projects";
                else if (to === "/blogs") key = "nav.blogs";
                else if (to === "/opensource") key = "nav.opensource";
                else if (to === "/contact") key = "nav.contact";

                const displayLabel = t(key) || label;
                return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      onClick={this.closeMenu}
                      className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                      style={({ isActive }) => ({
                        color: theme.text,
                        fontWeight: isActive ? "700" : "500",
                      })}
                    >
                      {displayLabel}
                    </NavLink>
                  </li>
                );
              })}

              {/* Theme toggle switch */}
              <li className="theme-toggle-item">
                <button
                  type="button"
                  className="portfolio-theme-toggle"
                  onClick={this.handleThemeToggle}
                  aria-label={isDarkMode ? t("theme.light") : t("theme.dark")}
                  title={isDarkMode ? t("theme.light") : t("theme.dark")}
                  style={{
                    color: theme.text,
                    "--toggle-border": isDarkMode ? "rgba(96, 165, 250, 0.3)" : "rgba(21, 101, 192, 0.2)",
                    "--toggle-bg": isDarkMode ? "rgba(15, 27, 45, 0.8)" : "rgba(255, 255, 255, 0.8)",
                  }}
                >
                  <i className={isDarkMode ? "fas fa-sun" : "fas fa-moon"} />
                  <span className="theme-toggle-label">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
                </button>
              </li>

              {/* Quick Contact Header CTA */}
              <li className="header-cta-item">
                <NavLink
                  to="/contact"
                  className="header-contact-cta"
                  onClick={this.handleHireMeClick}
                  aria-label="Hire Deepak Mandal"
                >
                  <span>Hire Me</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </NavLink>
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
  const { language, changeLanguage, t } = useLanguage();
  return (
    <HeaderInner
      {...props}
      logoName={logoName}
      menuLinks={data?.menuLinks}
      language={language}
      changeLanguage={changeLanguage}
      t={t}
    />
  );
}
