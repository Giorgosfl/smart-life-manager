import { ipcMain } from "electron";
import {
  hasCredentials,
  getCredentialsSafe,
  setCredentials,
} from "../store";
import { clearTuyaCaches } from "../lib/tuya";
import type { Credentials } from "../store";

export function registerCredentialHandlers(): void {
  ipcMain.handle("credentials:exists", () => hasCredentials());

  ipcMain.handle("credentials:get", () => getCredentialsSafe());

  ipcMain.handle("credentials:set", (_e, creds: Credentials) => {
    try {
      setCredentials(creds);
      clearTuyaCaches();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save credentials",
      };
    }
  });
}
