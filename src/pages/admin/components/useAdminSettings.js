import { useContext } from "react";
import { AdminSettingsContext } from "./AdminSettingsShared";

export function useAdminSettings() {
  return useContext(AdminSettingsContext);
}
