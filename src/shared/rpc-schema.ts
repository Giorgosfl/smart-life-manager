import type { RPCSchema } from "electrobun/bun";
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
} from "../../lib/types";

type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: string };

type SafeCredentials = {
  clientId: string;
  baseUrl: string;
  appUid: string;
};

type SetCredentialsParams = {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  appUid: string;
};

type Command = { code: string; value: boolean | string | number };

export type AppRPCSchema = {
  bun: RPCSchema<{
    requests: {
      // Credentials
      credentialsExists: { params: undefined; response: boolean };
      credentialsGet: {
        params: undefined;
        response: SafeCredentials | null;
      };
      credentialsSet: {
        params: SetCredentialsParams;
        response: ActionResult;
      };

      // Rooms
      roomsGetAll: { params: undefined; response: TuyaRoom[] };

      // Devices
      devicesGetAll: { params: undefined; response: TuyaDevice[] };
      devicesGetFunctions: {
        params: { deviceId: string };
        response: TuyaDeviceFunction[];
      };
      devicesSendCommand: {
        params: { deviceId: string; commands: Command[] };
        response: ActionResult<boolean>;
      };
      devicesRename: {
        params: { deviceId: string; name: string };
        response: ActionResult<boolean>;
      };
      devicesControlShutter: {
        params: { deviceId: string; action: "open" | "close" | "stop" };
        response: ActionResult<boolean>;
      };

      // Scenes
      scenesGetAll: { params: undefined; response: TuyaScene[] };
      scenesTrigger: {
        params: { sceneId: string };
        response: ActionResult<boolean>;
      };
      scenesCreate: {
        params: { name: string; actions: TuyaSceneAction[] };
        response: ActionResult;
      };
      scenesDelete: {
        params: { sceneId: string };
        response: ActionResult<boolean>;
      };

      // Automations
      automationsGetAll: { params: undefined; response: TuyaAutomation[] };
      automationsCreate: {
        params: { body: CreateAutomationBody };
        response: ActionResult<{ id: string }>;
      };
      automationsToggle: {
        params: { automationId: string; enabled: boolean };
        response: ActionResult<boolean>;
      };
      automationsDelete: {
        params: { automationId: string };
        response: ActionResult<boolean>;
      };

      // Timers
      timersGetAll: {
        params: { deviceId: string };
        response: TuyaTimer[];
      };
      timersCreate: {
        params: { deviceId: string; body: CreateTimerBody };
        response: ActionResult;
      };
      timersDelete: {
        params: { deviceId: string; timerId: string };
        response: ActionResult<boolean>;
      };

      // Mirrors
      mirrorsGetAll: {
        params: undefined;
        response: ActionResult<MirrorGroupsData>;
      };
      mirrorsCreate: {
        params: { name: string; main: MirrorButton; mirrors: MirrorButton[] };
        response: ActionResult<MirrorGroup>;
      };
      mirrorsDelete: {
        params: { groupId: string };
        response: ActionResult<boolean>;
      };

      // Hidden Devices
      devicesGetAllUnfiltered: { params: undefined; response: TuyaDevice[] };
      hiddenDevicesGet: { params: undefined; response: string[] };
      hiddenDevicesSet: {
        params: { deviceIds: string[] };
        response: ActionResult;
      };

      // Kill Switch
      killSwitchGet: {
        params: undefined;
        response: ActionResult<KillSwitchConfig | null>;
      };
      killSwitchCreate: {
        params: {
          trigger: { device_id: string; button_code: string; label: string };
          delay_seconds: number;
          excluded_device_ids: string[];
        };
        response: ActionResult<KillSwitchConfig>;
      };
      killSwitchDelete: {
        params: undefined;
        response: ActionResult<boolean>;
      };
    };
  }>;
  webview: RPCSchema<{
    requests: {};
    messages: {};
  }>;
};
