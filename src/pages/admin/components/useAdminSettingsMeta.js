import { useContext } from "react";
import { AdminSettingsMetaContext } from "./AdminSettingsShared";

export function useAdminSettingsMeta() {
  return useContext(AdminSettingsMetaContext);
}
