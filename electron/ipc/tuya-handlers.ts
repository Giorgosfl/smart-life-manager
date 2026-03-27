import { ipcMain } from "electron";
import {
  getDevices,
  getDeviceFunctions,
  sendCommand,
  renameDevice,
  getScenes,
  getAutomations,
  getTimers,
} from "../lib/tuya";
import {
  controlShutterAction,
  triggerSceneAction,
  createSceneAction,
  deleteSceneAction,
  createAutomationAction,
  toggleAutomationAction,
  deleteAutomationAction,
  createTimerAction,
  deleteTimerAction,
} from "../lib/actions";

export function registerTuyaHandlers(): void {
  // Queries - throw on error, TanStack Query catches
  ipcMain.handle("devices:getAll", () => getDevices());
  ipcMain.handle("devices:getFunctions", (_e, deviceId: string) =>
    getDeviceFunctions(deviceId)
  );
  ipcMain.handle("scenes:getAll", () => getScenes());
  ipcMain.handle("automations:getAll", () => getAutomations());
  ipcMain.handle("timers:getAll", (_e, deviceId: string) =>
    getTimers(deviceId)
  );

  // Mutations - return ActionResult
  ipcMain.handle(
    "devices:sendCommand",
    async (_e, deviceId: string, commands: { code: string; value: boolean | string | number }[]) => {
      try {
        const result = await sendCommand(deviceId, commands);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to send command" };
      }
    }
  );
  ipcMain.handle(
    "devices:rename",
    async (_e, deviceId: string, name: string) => {
      try {
        const result = await renameDevice(deviceId, name);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to rename device" };
      }
    }
  );
  ipcMain.handle(
    "devices:controlShutter",
    (_e, deviceId: string, action: "open" | "close" | "stop") =>
      controlShutterAction(deviceId, action)
  );
  ipcMain.handle("scenes:trigger", (_e, sceneId: string) =>
    triggerSceneAction(sceneId)
  );
  ipcMain.handle(
    "scenes:create",
    (_e, name: string, actions: { entity_id: string; action_executor: string; executor_property: Record<string, unknown> }[]) =>
      createSceneAction(name, actions)
  );
  ipcMain.handle("scenes:delete", (_e, sceneId: string) =>
    deleteSceneAction(sceneId)
  );
  ipcMain.handle("automations:create", (_e, body) =>
    createAutomationAction(body)
  );
  ipcMain.handle(
    "automations:toggle",
    (_e, automationId: string, enabled: boolean) =>
      toggleAutomationAction(automationId, enabled)
  );
  ipcMain.handle("automations:delete", (_e, automationId: string) =>
    deleteAutomationAction(automationId)
  );
  ipcMain.handle(
    "timers:create",
    (_e, deviceId: string, body) =>
      createTimerAction(deviceId, body)
  );
  ipcMain.handle(
    "timers:delete",
    (_e, deviceId: string, timerId: string) =>
      deleteTimerAction(deviceId, timerId)
  );
}
