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

  render() {
    const { theme, logoName, t, language, changeLanguage } = this.props;
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
                    <NavLink to={to} style={({ isActive }) => ({ color: theme.text, fontWeight: isActive ? "bold" : "normal" })}>
                      {displayLabel}
                    </NavLink>
                  </li>
                );
              })}
              <li className="theme-toggle-item">
                <button
                  type="button"
                  className="portfolio-theme-toggle"
                  onClick={this.handleThemeToggle}
                  aria-label={isDarkMode ? t("theme.light") : t("theme.dark")}
                  title={isDarkMode ? t("theme.light") : t("theme.dark")}
                  style={{ color: theme.text, "--toggle-border": theme.cardBorder || theme.imageDark, "--toggle-bg": theme.cardBackground || theme.body }}
                >
                  <i className={isDarkMode ? "fas fa-sun" : "fas fa-moon"} />
                  <span className="theme-toggle-label">{isDarkMode ? t("theme.light") : t("theme.dark")}</span>
                </button>
              </li>
              <li className="language-toggle-item">
                <button
                  type="button"
                  className="portfolio-language-toggle"
                  onClick={() => changeLanguage(language === "en" ? "es" : "en")}
                  title={language === "en" ? "Cambiar a Español" : "Switch to English"}
                  style={{ color: theme.text, "--toggle-border": theme.cardBorder || theme.imageDark, "--toggle-bg": theme.cardBackground || theme.body }}
                >
                  <i className="fas fa-globe" />
                  <span className="language-toggle-label">{language === "en" ? "ES" : "EN"}</span>
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
  const { language, changeLanguage, t } = useLanguage();
  return <HeaderInner {...props} logoName={logoName} menuLinks={data?.menuLinks} language={language} changeLanguage={changeLanguage} t={t} />;
}
