import { useCallback, useEffect, useState } from "react";
import { subscribeToAdminPanelSettings } from "../../../firebase/blogService";
import {
  ADMIN_SETTINGS_UPDATED_EVENT,
  loadAdminSettings,
  normalizeAdminSettings,
} from "./adminSettingsConfig";
import { AdminSettingsContext, AdminSettingsMetaContext } from "./AdminSettingsShared";

export function AdminSettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadAdminSettings);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setSettings(loadAdminSettings());
  }, []);

  useEffect(() => {
    window.addEventListener("storage", refresh);
    window.addEventListener(ADMIN_SETTINGS_UPDATED_EVENT, refresh);

    const unsubscribe = subscribeToAdminPanelSettings(
      (incoming) => {
        setSettings(normalizeAdminSettings(incoming));
        setLoading(false);
      },
      () => {
        refresh();
        setLoading(false);
      },
    );

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(ADMIN_SETTINGS_UPDATED_EVENT, refresh);
      unsubscribe?.();
    };
  }, [refresh]);

  return (
    <AdminSettingsMetaContext.Provider value={{ loading }}>
      <AdminSettingsContext.Provider value={settings}>
        {children}
      </AdminSettingsContext.Provider>
    </AdminSettingsMetaContext.Provider>
  );
}
