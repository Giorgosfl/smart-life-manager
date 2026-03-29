import { Electroview } from "electrobun/view";
import type { AppRPCSchema } from "../shared/rpc-schema";
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
  KillSwitchConfig,
  MirrorButton,
  MirrorGroup,
  MirrorGroupsData,
} from "@lib/types";

type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: string };

const rpc = Electroview.defineRPC<AppRPCSchema>({
  handlers: {
    requests: {},
  },
});

const electroview = new Electroview({ rpc });

// --- Credentials ---
export const credentialsExists = () =>
  electroview.rpc!.request.credentialsExists();

export const credentialsGet = () =>
  electroview.rpc!.request.credentialsGet();

export const credentialsSet = (creds: {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  appUid: string;
}) => electroview.rpc!.request.credentialsSet(creds);

// --- Rooms ---
export const roomsGetAll = () =>
  electroview.rpc!.request.roomsGetAll();

// --- Devices ---
export const devicesGetAll = () =>
  electroview.rpc!.request.devicesGetAll();

export const devicesGetFunctions = (deviceId: string) =>
  electroview.rpc!.request.devicesGetFunctions({ deviceId });

export const devicesSendCommand = (
  deviceId: string,
  commands: { code: string; value: boolean | string | number }[]
) => electroview.rpc!.request.devicesSendCommand({ deviceId, commands });

export const devicesRename = (deviceId: string, name: string) =>
  electroview.rpc!.request.devicesRename({ deviceId, name });

export const devicesControlShutter = (
  deviceId: string,
  action: "open" | "close" | "stop"
) => electroview.rpc!.request.devicesControlShutter({ deviceId, action });

// --- Scenes ---
export const scenesGetAll = () =>
  electroview.rpc!.request.scenesGetAll();

export const scenesTrigger = (sceneId: string) =>
  electroview.rpc!.request.scenesTrigger({ sceneId });

export const scenesCreate = (
  name: string,
  actions: TuyaSceneAction[]
) => electroview.rpc!.request.scenesCreate({ name, actions });

export const scenesDelete = (sceneId: string) =>
  electroview.rpc!.request.scenesDelete({ sceneId });

// --- Automations ---
export const automationsGetAll = () =>
  electroview.rpc!.request.automationsGetAll();

export const automationsCreate = (body: CreateAutomationBody) =>
  electroview.rpc!.request.automationsCreate({ body });

export const automationsToggle = (automationId: string, enabled: boolean) =>
  electroview.rpc!.request.automationsToggle({ automationId, enabled });

export const automationsDelete = (automationId: string) =>
  electroview.rpc!.request.automationsDelete({ automationId });

// --- Timers ---
export const timersGetAll = (deviceId: string) =>
  electroview.rpc!.request.timersGetAll({ deviceId });

export const timersCreate = (deviceId: string, body: CreateTimerBody) =>
  electroview.rpc!.request.timersCreate({ deviceId, body });

export const timersDelete = (deviceId: string, timerId: string) =>
  electroview.rpc!.request.timersDelete({ deviceId, timerId });

// --- Mirrors ---
export const mirrorsGetAll = () =>
  electroview.rpc!.request.mirrorsGetAll();

export const mirrorsCreate = (
  name: string,
  main: MirrorButton,
  mirrors: MirrorButton[]
) => electroview.rpc!.request.mirrorsCreate({ name, main, mirrors });

export const mirrorsDelete = (groupId: string) =>
  electroview.rpc!.request.mirrorsDelete({ groupId });

// --- Hidden Devices ---
export const devicesGetAllUnfiltered = () =>
  electroview.rpc!.request.devicesGetAllUnfiltered();

export const hiddenDevicesGet = () =>
  electroview.rpc!.request.hiddenDevicesGet();

export const hiddenDevicesSet = (deviceIds: string[]) =>
  electroview.rpc!.request.hiddenDevicesSet({ deviceIds });

// --- Kill Switch ---
export const killSwitchGet = () =>
  electroview.rpc!.request.killSwitchGet();

export const killSwitchCreate = (
  trigger: { device_id: string; button_code: string; label: string },
  delay_seconds: number,
  excluded_device_ids: string[]
) =>
  electroview.rpc!.request.killSwitchCreate({
    trigger,
    delay_seconds,
    excluded_device_ids,
  });

export const killSwitchDelete = () =>
  electroview.rpc!.request.killSwitchDelete();
