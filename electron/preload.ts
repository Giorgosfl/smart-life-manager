import { contextBridge, ipcRenderer } from "electron";

const ALLOWED_CHANNELS = new Set([
  "credentials:exists",
  "credentials:get",
  "credentials:set",
  "devices:getAll",
  "devices:getFunctions",
  "devices:sendCommand",
  "devices:rename",
  "devices:controlShutter",
  "scenes:getAll",
  "scenes:trigger",
  "scenes:create",
  "scenes:delete",
  "automations:getAll",
  "automations:create",
  "automations:toggle",
  "automations:delete",
  "timers:getAll",
  "timers:create",
  "timers:delete",
  "mirrors:getAll",
  "mirrors:create",
  "mirrors:delete",
]);

contextBridge.exposeInMainWorld("api", {
  invoke: (channel: string, ...args: unknown[]) => {
    if (!ALLOWED_CHANNELS.has(channel)) {
      return Promise.reject(new Error(`Blocked IPC channel: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
});
