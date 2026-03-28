import type {
  TuyaDevice,
  TuyaDeviceFunction,
  TuyaRoom,
  TuyaScene,
  TuyaSceneAction,
  TuyaAutomation,
  TuyaTimer,
  CreateAutomationBody,
  CreateTimerBody,
  MirrorButton,
  MirrorGroup,
  MirrorGroupsData,
} from "@lib/types";

type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: string };

declare global {
  interface Window {
    api: {
      invoke(channel: string, ...args: unknown[]): Promise<unknown>;
    };
  }
}

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return window.api.invoke(channel, ...args) as Promise<T>;
}

// --- Credentials ---
export const credentialsExists = () =>
  invoke<boolean>("credentials:exists");

export const credentialsGet = () =>
  invoke<{ clientId: string; baseUrl: string; appUid: string } | null>(
    "credentials:get"
  );

export const credentialsSet = (creds: {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  appUid: string;
}) => invoke<ActionResult>("credentials:set", creds);

// --- Rooms ---
export const roomsGetAll = () =>
  invoke<TuyaRoom[]>("rooms:getAll");

// --- Devices ---
export const devicesGetAll = () =>
  invoke<TuyaDevice[]>("devices:getAll");

export const devicesGetFunctions = (deviceId: string) =>
  invoke<TuyaDeviceFunction[]>("devices:getFunctions", deviceId);

export const devicesSendCommand = (
  deviceId: string,
  commands: { code: string; value: boolean | string | number }[]
) => invoke<ActionResult<boolean>>("devices:sendCommand", deviceId, commands);

export const devicesRename = (deviceId: string, name: string) =>
  invoke<ActionResult<boolean>>("devices:rename", deviceId, name);

export const devicesControlShutter = (
  deviceId: string,
  action: "open" | "close" | "stop"
) => invoke<ActionResult<boolean>>("devices:controlShutter", deviceId, action);

// --- Scenes ---
export const scenesGetAll = () =>
  invoke<TuyaScene[]>("scenes:getAll");

export const scenesTrigger = (sceneId: string) =>
  invoke<ActionResult<boolean>>("scenes:trigger", sceneId);

export const scenesCreate = (
  name: string,
  actions: TuyaSceneAction[]
) => invoke<ActionResult>("scenes:create", name, actions);

export const scenesDelete = (sceneId: string) =>
  invoke<ActionResult<boolean>>("scenes:delete", sceneId);

// --- Automations ---
export const automationsGetAll = () =>
  invoke<TuyaAutomation[]>("automations:getAll");

export const automationsCreate = (body: CreateAutomationBody) =>
  invoke<ActionResult<{ id: string }>>("automations:create", body);

export const automationsToggle = (automationId: string, enabled: boolean) =>
  invoke<ActionResult<boolean>>("automations:toggle", automationId, enabled);

export const automationsDelete = (automationId: string) =>
  invoke<ActionResult<boolean>>("automations:delete", automationId);

// --- Timers ---
export const timersGetAll = (deviceId: string) =>
  invoke<TuyaTimer[]>("timers:getAll", deviceId);

export const timersCreate = (deviceId: string, body: CreateTimerBody) =>
  invoke<ActionResult>("timers:create", deviceId, body);

export const timersDelete = (deviceId: string, timerId: string) =>
  invoke<ActionResult<boolean>>("timers:delete", deviceId, timerId);

// --- Mirrors ---
export const mirrorsGetAll = () =>
  invoke<ActionResult<MirrorGroupsData>>("mirrors:getAll");

export const mirrorsCreate = (
  name: string,
  main: MirrorButton,
  mirrors: MirrorButton[]
) => invoke<ActionResult<MirrorGroup>>("mirrors:create", name, main, mirrors);

export const mirrorsDelete = (groupId: string) =>
  invoke<ActionResult<boolean>>("mirrors:delete", groupId);
