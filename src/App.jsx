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

  // Show a clean floating spinner while the install-check fetch runs.
  // No box/card — just a spinner + label floating on the page background.
  if (!installChecked) {
    const bg       = theme?.body            || "#F0F8FF";
    const accent   = theme?.imageHighlight  || theme?.gradientStart || "#1565C0";
    const accentEnd= theme?.gradientEnd     || "#42A5F5";
    const textColor= theme?.text            || "#0A1628";
    const isDark   = theme === darkTheme;

    return (
      <div style={{
        position: "fixed", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 18,
        background: bg,
        zIndex: 9999,
      }}>
        {/* Spinner ring — no card around it */}
        <div style={{ position: "relative", width: 52, height: 52 }}>
          {/* Track */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `3px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)"}`,
          }} />
          {/* Arc */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "3px solid transparent",
            borderTopColor: accent,
            borderRightColor: accentEnd,
            animation: "pf-spin 0.9s linear infinite",
          }} />
        </div>

        {/* Label */}
        <div style={{
          fontSize: 13, fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase",
          color: textColor, opacity: 0.45,
          animation: "pf-fade 2s ease-in-out infinite",
        }}>
          Loading...
        </div>

        <style>{`
          @keyframes pf-spin { to { transform: rotate(360deg); } }
          @keyframes pf-fade { 0%,100% { opacity:0.3; } 50% { opacity:0.6; } }
        `}</style>
      </div>
    );
  }

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
