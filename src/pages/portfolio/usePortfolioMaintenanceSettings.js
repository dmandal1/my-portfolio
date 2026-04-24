import { useEffect, useState } from "react";
import { subscribeToAdminPanelSettings } from "../../firebase/blogService";
import { DEFAULT_SETTINGS, loadAdminSettings, normalizeAdminSettings } from "../admin/components/adminSettingsConfig";

export default function usePortfolioMaintenanceSettings() {
  const [settings, setSettings] = useState(() => normalizeAdminSettings(loadAdminSettings()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const apply = (incoming) => {
      if (cancelled) return;
      const local = loadAdminSettings();
      setSettings(normalizeAdminSettings({ ...local, ...incoming }));
      setLoading(false);
    };

    const unsubscribe = subscribeToAdminPanelSettings(
      apply,
      () => {
        if (!cancelled) {
          setSettings(normalizeAdminSettings(loadAdminSettings()));
          setLoading(false);
        }
      },
    );

    const fallbackTimer = setTimeout(() => {
      if (!cancelled) {
        setSettings(normalizeAdminSettings(loadAdminSettings()));
        setLoading(false);
      }
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      unsubscribe?.();
    };
  }, []);

  return {
    loading,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    enabled: Boolean(settings.portfolioMaintenanceMode),
  };
}
