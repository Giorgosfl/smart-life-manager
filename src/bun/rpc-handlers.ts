import {
  hasCredentials,
  getCredentialsSafe,
  setCredentials,
  getHiddenDeviceIds,
  setHiddenDeviceIds,
  type Credentials,
} from "./store";
import { clearTuyaCaches } from "./tuya";
import * as tuya from "./tuya";
import * as actions from "./actions";

export const handlers = {
  // --- Credentials ---
  credentialsExists: () => hasCredentials(),

  credentialsGet: () => getCredentialsSafe(),

  credentialsSet: (params: Credentials) => {
    setCredentials(params);
    clearTuyaCaches();
    return { success: true as const };
  },

  // --- Rooms ---
  roomsGetAll: () => tuya.getRooms(),

  // --- Devices ---
  devicesGetAll: async () => {
    const devices = await tuya.getDevices();
    const hidden = new Set(getHiddenDeviceIds());
    return hidden.size > 0 ? devices.filter((d) => !hidden.has(d.id)) : devices;
  },

  devicesGetFunctions: (params: { deviceId: string }) =>
    tuya.getDeviceFunctions(params.deviceId),

  devicesSendCommand: async (params: {
    deviceId: string;
    commands: { code: string; value: boolean | string | number }[];
  }) => {
    try {
      const result = await tuya.sendCommand(params.deviceId, params.commands);
      return { success: true as const, data: result };
    } catch (error) {
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to send command",
      };
    }
  },

  devicesRename: (params: { deviceId: string; name: string }) =>
    actions.renameDeviceAction(params.deviceId, params.name),

  devicesControlShutter: (params: {
    deviceId: string;
    action: "open" | "close" | "stop";
  }) => actions.controlShutterAction(params.deviceId, params.action),

  // --- Scenes ---
  scenesGetAll: () => tuya.getScenes(),

  scenesTrigger: (params: { sceneId: string }) =>
    actions.triggerSceneAction(params.sceneId),

  scenesCreate: (params: {
    name: string;
    actions: {
      entity_id: string;
      action_executor: string;
      executor_property: Record<string, unknown>;
    }[];
  }) => actions.createSceneAction(params.name, params.actions),

  scenesDelete: (params: { sceneId: string }) =>
    actions.deleteSceneAction(params.sceneId),

  // --- Automations ---
  automationsGetAll: () => tuya.getAutomations(),

  automationsCreate: (params: { body: actions.CreateAutomationBody }) =>
    actions.createAutomationAction(params.body),

  automationsToggle: (params: { automationId: string; enabled: boolean }) =>
    actions.toggleAutomationAction(params.automationId, params.enabled),

  automationsDelete: (params: { automationId: string }) =>
    actions.deleteAutomationAction(params.automationId),

  // --- Timers ---
  timersGetAll: (params: { deviceId: string }) =>
    tuya.getTimers(params.deviceId),

  timersCreate: (params: { deviceId: string; body: actions.CreateTimerBody }) =>
    actions.createTimerAction(params.deviceId, params.body),

  timersDelete: (params: { deviceId: string; timerId: string }) =>
    actions.deleteTimerAction(params.deviceId, params.timerId),

  // --- Mirrors ---
  mirrorsGetAll: () => actions.getMirrorGroupsAction(),

  mirrorsCreate: (params: {
    name: string;
    main: actions.MirrorButton;
    mirrors: actions.MirrorButton[];
  }) => actions.createMirrorGroupAction(params.name, params.main, params.mirrors),

  mirrorsDelete: (params: { groupId: string }) =>
    actions.deleteMirrorGroupAction(params.groupId),

  // --- Hidden Devices ---
  devicesGetAllUnfiltered: () => tuya.getDevices(),

  hiddenDevicesGet: () => getHiddenDeviceIds(),

  hiddenDevicesSet: (params: { deviceIds: string[] }) => {
    setHiddenDeviceIds(params.deviceIds);
    return { success: true as const };
  },

  // --- Kill Switch ---
  killSwitchGet: () => actions.getKillSwitchAction(),

  killSwitchCreate: (params: {
    trigger: { device_id: string; button_code: string; label: string };
    delay_seconds: number;
    excluded_device_ids: string[];
  }) =>
    actions.createKillSwitchAction(
      params.trigger,
      params.delay_seconds,
      params.excluded_device_ids
    ),

  killSwitchDelete: () => actions.deleteKillSwitchAction(),
};

// Re-export types used in handler params
export type {
  CreateAutomationBody,
  CreateTimerBody,
  MirrorButton,
} from "../../lib/types";
