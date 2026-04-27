import React, { useEffect, useState } from "react";
import "./App.css";
import Main from "./containers/Main";
import { ThemeProvider } from "styled-components";
import { chosenTheme, darkTheme } from "./theme";
import { GlobalStyles } from "./global";

const PORTFOLIO_THEME_PREVIEW_EVENT = "portfolioThemePreviewUpdated";
const PORTFOLIO_DARK_MODE_KEY = "portfolioDarkMode";

function resolvePublicTheme() {
  if (typeof window === "undefined") return chosenTheme;
  return localStorage.getItem(PORTFOLIO_DARK_MODE_KEY) === "true" ? darkTheme : chosenTheme;
}

function App() {
  const [theme, setTheme] = useState(resolvePublicTheme);

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
