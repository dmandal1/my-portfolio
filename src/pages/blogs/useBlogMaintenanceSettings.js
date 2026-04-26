import { DEFAULT_SETTINGS } from "../admin/components/adminSettingsConfig";
import { useAdminSettings } from "../admin/components/useAdminSettings";
import { useAdminSettingsMeta } from "../admin/components/useAdminSettingsMeta";

export default function useBlogMaintenanceSettings() {
  const settings = useAdminSettings();
  const { loading } = useAdminSettingsMeta();

  return {
    loading,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    enabled: Boolean(settings.blogMaintenanceMode),
  };
}
