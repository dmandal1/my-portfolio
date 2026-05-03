import { createContext } from "react";
import { DEFAULT_SETTINGS } from "./adminSettingsConfig";

export const AdminSettingsContext = createContext(DEFAULT_SETTINGS);
export const AdminSettingsMetaContext = createContext({
  loading: false,
});
