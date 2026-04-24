import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, loadAdminSettings } from "./adminSettingsConfig";

const AdminSettingsContext = createContext(DEFAULT_SETTINGS);

export function AdminSettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadAdminSettings);

  const refresh = useCallback(() => {
    setSettings(loadAdminSettings());
  }, []);

  useEffect(() => {
    window.addEventListener("storage", refresh);
    window.addEventListener("adminSettingsUpdated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("adminSettingsUpdated", refresh);
    };
  }, [refresh]);

  return (
    <AdminSettingsContext.Provider value={settings}>
      {children}
    </AdminSettingsContext.Provider>
  );
}

export function useAdminSettings() {
  return useContext(AdminSettingsContext);
}
