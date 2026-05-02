import React, { useEffect, useState } from "react";
import "./App.css";
import Main from "./containers/Main";
import { ThemeProvider } from "styled-components";
import { chosenTheme, darkTheme } from "./theme";
import { GlobalStyles } from "./global";

const PORTFOLIO_THEME_PREVIEW_EVENT = "portfolioThemePreviewUpdated";
const PORTFOLIO_DARK_MODE_KEY       = "portfolioDarkMode";
const API = import.meta.env.VITE_API_URL || "/api";

function resolvePublicTheme() {
  if (typeof window === "undefined") return chosenTheme;
  return localStorage.getItem(PORTFOLIO_DARK_MODE_KEY) === "true" ? darkTheme : chosenTheme;
}

function App() {
  const [theme, setTheme]             = useState(resolvePublicTheme);
  const [installChecked, setChecked]  = useState(false);

  // On mount: check if the site has been installed.
  // If not, redirect the browser to the #/install route.
  useEffect(() => {
    fetch(`${API}/status.php`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.installed && !window.location.hash.startsWith("#/install")) {
          window.location.replace("#/install");
        }
      })
      .catch(() => {
        // API unreachable — backend not yet uploaded; show installer anyway
        if (!window.location.hash.startsWith("#/install")) {
          window.location.replace("#/install");
        }
      })
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-portfolio-theme",
      theme === darkTheme ? "dark" : "light",
    );
    document.documentElement.style.setProperty("--nav-hover-bg", theme.highlight);
    document.documentElement.style.setProperty("--nav-menu-bg", theme.body);
  }, [theme]);

  useEffect(() => {
    const onPreviewTheme = (event) => {
      const nextTheme = event?.detail?.theme;
      if (!nextTheme) return;
      const isDark = nextTheme === "dark";
      localStorage.setItem(PORTFOLIO_DARK_MODE_KEY, String(isDark));
      setTheme(isDark ? darkTheme : chosenTheme);
    };

    window.addEventListener(PORTFOLIO_THEME_PREVIEW_EVENT, onPreviewTheme);
    return () => window.removeEventListener(PORTFOLIO_THEME_PREVIEW_EVENT, onPreviewTheme);
  }, []);

  // Show nothing until we know whether the site is installed.
  // This prevents a flash of the portfolio before redirect to /install.
  if (!installChecked) return null;

  return (
    <ThemeProvider theme={theme}>
      <>
        <GlobalStyles />
        <div>
          <Main theme={theme} />
        </div>
      </>
    </ThemeProvider>
  );
}

export default App;
