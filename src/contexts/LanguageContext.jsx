import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "../constants/translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem("portfolio_lang");
      if (saved === "en" || saved === "es") return saved;
    } catch {
      // ignore
    }
    
    // Auto-detect browser locale
    try {
      const locale = navigator.language || navigator.userLanguage;
      if (locale && locale.startsWith("es")) return "es";
    } catch {
      // ignore
    }
    
    return "en";
  });

  function changeLanguage(lang) {
    if (lang === "en" || lang === "es") {
      setLanguage(lang);
      try {
        localStorage.setItem("portfolio_lang", lang);
      } catch {
        // ignore
      }
    }
  }

  // Translate static UI elements
  function t(key) {
    const dict = translations[language] || translations["en"];
    return dict[key] || translations["en"][key] || key;
  }

  // Extract translation from database dynamically
  function tDynamic(field) {
    if (!field) return "";
    if (typeof field === "object") {
      return field[language] || field["en"] || "";
    }
    return String(field);
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, tDynamic }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
