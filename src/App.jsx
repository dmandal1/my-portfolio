import React, { useEffect, useState } from "react";
import "./App.css";
import Main from "./containers/Main";
import { ThemeProvider } from "styled-components";
import { chosenTheme, darkTheme } from "./theme";
import { GlobalStyles } from "./global";

const ADMIN_SETTINGS_KEY = "adminPanelSettings";

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
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");

    window.addEventListener("storage", refreshTheme);
    window.addEventListener("adminSettingsUpdated", refreshTheme);
    media?.addEventListener?.("change", refreshTheme);

    return () => {
      window.removeEventListener("storage", refreshTheme);
      window.removeEventListener("adminSettingsUpdated", refreshTheme);
      media?.removeEventListener?.("change", refreshTheme);
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
