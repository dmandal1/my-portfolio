import React, { useEffect, useState } from "react";
import "./App.css";
import Main from "./containers/Main";
import { ThemeProvider } from "styled-components";
import { chosenTheme, darkTheme } from "./theme";
import { GlobalStyles } from "./global";
import { subscribeToAdminPanelSettings } from "./firebase/blogService";
import {
  ADMIN_SETTINGS_UPDATED_EVENT,
  SETTINGS_KEY as ADMIN_SETTINGS_KEY,
} from "./pages/admin/components/adminSettingsConfig";

const PORTFOLIO_THEME_PREVIEW_EVENT = "portfolioThemePreviewUpdated";

function resolvePublicTheme() {
  if (typeof window === "undefined") return chosenTheme;

  let savedTheme = "";
  try {
    savedTheme = JSON.parse(window.localStorage.getItem(ADMIN_SETTINGS_KEY) || "{}").theme || "";
  } catch {
    savedTheme = "";
  }

  if (!savedTheme) {
    savedTheme = window.localStorage.getItem("adminDarkMode") === "true" ? "dark" : "light";
  }

  if (savedTheme === "system") {
    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? darkTheme : chosenTheme;
  }

  return savedTheme === "dark" ? darkTheme : chosenTheme;
}

function resolveThemeByName(themeName) {
  if (themeName === "dark") return darkTheme;
  return chosenTheme;
}

function App() {
  const [theme, setTheme] = useState(resolvePublicTheme);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-portfolio-theme",
      theme === darkTheme ? "dark" : "light",
    );
    // Used by Header.css so hover backgrounds don't rely on inline JS styles (prevents theme-toggle flashes).
    document.documentElement.style.setProperty("--nav-hover-bg", theme.highlight);
    document.documentElement.style.setProperty("--nav-menu-bg", theme.body);
  }, [theme]);

  useEffect(() => {
    const refreshTheme = () => setTheme(resolvePublicTheme());
    const onPreviewTheme = (event) => {
      const nextTheme = event?.detail?.theme;
      if (!nextTheme) return;
      setTheme(resolveThemeByName(nextTheme));
    };
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");

    window.addEventListener("storage", refreshTheme);
    window.addEventListener(ADMIN_SETTINGS_UPDATED_EVENT, refreshTheme);
    window.addEventListener(PORTFOLIO_THEME_PREVIEW_EVENT, onPreviewTheme);
    media?.addEventListener?.("change", refreshTheme);
    const unsubscribe = subscribeToAdminPanelSettings(refreshTheme);

    return () => {
      window.removeEventListener("storage", refreshTheme);
      window.removeEventListener(ADMIN_SETTINGS_UPDATED_EVENT, refreshTheme);
      window.removeEventListener(PORTFOLIO_THEME_PREVIEW_EVENT, onPreviewTheme);
      media?.removeEventListener?.("change", refreshTheme);
      unsubscribe?.();
    };
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
