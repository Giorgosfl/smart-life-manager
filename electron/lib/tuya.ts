import crypto from "crypto";
import { getCredentials } from "../store";
import type {
  TuyaDevice,
  TuyaDeviceFunction,
  TuyaScene,
  TuyaAutomation,
  TuyaTimer,
  TuyaHome,
  TuyaRoom,
  CreateAutomationBody,
  CreateSceneBody,
  CreateTimerBody,
} from "@lib/types";

// In-memory caches
let cachedToken: { access_token: string; expires_at: number } | null = null;
let cachedUid: string | null = null;
let cachedHomeId: number | null = null;
let cachedSpaceId: string | null = null;

export function clearTuyaCaches(): void {
  cachedToken = null;
  cachedUid = null;
  cachedHomeId = null;
  cachedSpaceId = null;
}

function requireCredentials() {
  const creds = getCredentials();
  if (!creds) throw new Error("Tuya credentials not configured");
  return creds;
}

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function hmacSha256(message: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(message, "utf8")
    .digest("hex")
    .toUpperCase();
}

function buildSignature(
  method: string,
  path: string,
  body: string,
  t: string,
  accessToken: string,
  clientId: string,
  clientSecret: string
): string {
  const bodyHash = sha256(body || "");
  const headers = "";
  const stringToSign = `${method}\n${bodyHash}\n${headers}\n${path}`;
  const message = clientId + accessToken + t + stringToSign;
  return hmacSha256(message, clientSecret);
}

async function getToken(): Promise<{ access_token: string; uid: string }> {
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return { access_token: cachedToken.access_token, uid: cachedUid! };
  }

  const { clientId, clientSecret, baseUrl } = requireCredentials();
  const t = Date.now().toString();
  const path = "/v1.0/token?grant_type=1";
  const sign = buildSignature("GET", path, "", t, "", clientId, clientSecret);

  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      client_id: clientId,
      sign,
      t,
      sign_method: "HMAC-SHA256",
    },
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(`Tuya token error: ${data.msg} (code: ${data.code})`);
  }

  cachedToken = {
    access_token: data.result.access_token,
    expires_at: Date.now() + data.result.expire_time * 1000 - 60000,
  };
  cachedUid = data.result.uid;
  return { access_token: data.result.access_token, uid: data.result.uid };
}

async function tuyaRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const { clientId, clientSecret, baseUrl } = requireCredentials();
  const { access_token } = await getToken();
  const t = Date.now().toString();
  const bodyStr = body ? JSON.stringify(body) : "";
  const sign = buildSignature(
    method,
    path,
    bodyStr,
    t,
    access_token,
    clientId,
    clientSecret
  );

  const headers: Record<string, string> = {
    client_id: clientId,
    sign,
    t,
    sign_method: "HMAC-SHA256",
    access_token,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? bodyStr : undefined,
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(`Tuya API error: ${data.msg} (code: ${data.code})`);
  }
  return data.result as T;
}

async function getUid(): Promise<string> {
  const { appUid } = requireCredentials();
  return appUid;
}

async function getHomeId(): Promise<number> {
  if (cachedHomeId) return cachedHomeId;
  const uid = await getUid();
  const homes = await tuyaRequest<TuyaHome[]>(
    "GET",
    `/v1.0/users/${uid}/homes`
  );
  if (!homes || homes.length === 0) {
    throw new Error("No homes found for this Tuya account");
  }
  cachedHomeId = homes[0].home_id;
  return cachedHomeId;
}

// === Room APIs ===

export async function getRooms(): Promise<TuyaRoom[]> {
  const homeId = await getHomeId();
  const result = await tuyaRequest<unknown>(
    "GET",
    `/v1.0/homes/${homeId}/rooms`
  );
  console.log("[getRooms] raw result:", JSON.stringify(result, null, 2));

  // Extract rooms array - handle both wrapped and direct formats
  const rawRooms: { room_id: number; name: string }[] =
    Array.isArray(result) ? result :
    (result as Record<string, unknown>)?.rooms as { room_id: number; name: string }[] ?? [];

  console.log("[getRooms] parsed rooms:", rawRooms.length);

  // Fetch device IDs for each room in parallel
  const rooms = await Promise.all(
    rawRooms.map(async (room) => {
      try {
        const devices = await tuyaRequest<unknown>(
          "GET",
          `/v1.0/homes/${homeId}/rooms/${room.room_id}/devices`
        );
        console.log(`[getRooms] room "${room.name}" devices:`, JSON.stringify(devices, null, 2));
        const deviceList = Array.isArray(devices) ? devices : [];
        return {
          room_id: room.room_id,
          name: room.name,
          devices: deviceList.map((d: { id: string }) => d.id),
        };
      } catch (err) {
        console.error(`[getRooms] Error fetching devices for room "${room.name}":`, err);
        return { room_id: room.room_id, name: room.name, devices: [] };
      }
    })
  );
  return rooms;
}

// === Device APIs ===

export async function getDevices(): Promise<TuyaDevice[]> {
  const uid = await getUid();
  return tuyaRequest<TuyaDevice[]>("GET", `/v1.0/users/${uid}/devices`);
}

export async function getDeviceFunctions(
  deviceId: string
): Promise<TuyaDeviceFunction[]> {
  const result = await tuyaRequest<{ functions: TuyaDeviceFunction[] }>(
    "GET",
    `/v1.0/devices/${deviceId}/functions`
  );
  return result.functions;
}

export async function sendCommand(
  deviceId: string,
  commands: { code: string; value: boolean | string | number }[]
): Promise<boolean> {
  return tuyaRequest<boolean>("POST", `/v1.0/devices/${deviceId}/commands`, {
    commands,
  });
}

export async function renameDevice(
  deviceId: string,
  name: string
): Promise<boolean> {
  return tuyaRequest<boolean>("PUT", `/v1.0/devices/${deviceId}`, { name });
}

// === Space ID resolution (v2.0 uses space_id instead of home_id) ===

async function getSpaceId(): Promise<string> {
  if (cachedSpaceId) return cachedSpaceId;
  // Try using home_id as space_id first (homes are built on spaces)
  const homeId = await getHomeId();
  cachedSpaceId = String(homeId);
  return cachedSpaceId;
}

// v2.0 API response types (internal, mapped to our public types)
interface V2Rule {
  id: string;
  name: string;
  type: "scene" | "automation";
  status: "enable" | "disable";
  running_mode?: string;
  space_id?: string;
}

interface V2RuleDetail extends V2Rule {
  decision_expr?: string;
  conditions?: V2Condition[];
  actions?: V2Action[];
}

interface V2Condition {
  entity_id: string;
  entity_type: string;
  code?: number;
  expr: {
    status_code: string;
    comparator: string;
    status_value: boolean | string | number;
  };
}

interface V2Action {
  entity_id: string;
  action_executor: string;
  executor_property: {
    function_code: string;
    function_value: boolean | string | number;
  };
}

interface V2ListResponse {
  list: V2Rule[];
  total: number;
  has_more: boolean;
}

// === Scene APIs (v2.0) ===

export async function getScenes(): Promise<TuyaScene[]> {
  const spaceId = await getSpaceId();
  const result = await tuyaRequest<V2ListResponse>(
    "GET",
    `/v2.0/cloud/scene/rule?space_id=${spaceId}&type=scene`
  );
  return (result.list || []).map((rule) => ({
    scene_id: rule.id,
    name: rule.name,
    status: rule.status,
    actions: [],
    enabled: rule.status === "enable",
  }));
}

export async function triggerScene(sceneId: string): Promise<boolean> {
  return tuyaRequest<boolean>(
    "POST",
    `/v2.0/cloud/scene/rule/${sceneId}/actions/trigger`
  );
}

export async function createScene(body: CreateSceneBody): Promise<unknown> {
  const spaceId = await getSpaceId();
  return tuyaRequest("POST", `/v2.0/cloud/scene/rule`, {
    space_id: spaceId,
    name: body.name,
    type: "scene",
    actions: body.actions.map((a) => ({
      entity_id: a.entity_id,
      action_executor: a.action_executor === "dpIssue" ? "device_issue" : a.action_executor,
      executor_property: convertActionPropertyToV2(a.executor_property),
    })),
  });
}

export async function deleteScene(sceneId: string): Promise<boolean> {
  const spaceId = await getSpaceId();
  return tuyaRequest<boolean>(
    "DELETE",
    `/v2.0/cloud/scene/rule?ids=${sceneId}&space_id=${spaceId}`
  );
}

// === Automation APIs (v2.0) ===

export async function getAutomations(): Promise<TuyaAutomation[]> {
  const spaceId = await getSpaceId();
  const result = await tuyaRequest<V2ListResponse>(
    "GET",
    `/v2.0/cloud/scene/rule?space_id=${spaceId}&type=automation`
  );
  return (result.list || []).map((rule) => ({
    id: rule.id,
    name: rule.name,
    status: rule.status,
    enabled: rule.status === "enable",
    conditions: [],
    actions: [],
    match_type: 1,
  }));
}

export async function createAutomation(
  body: CreateAutomationBody
): Promise<{ id: string }> {
  const spaceId = await getSpaceId();
  const decisionExpr = body.match_type === 1 ? "and" : "or";
  return tuyaRequest<{ id: string }>("POST", `/v2.0/cloud/scene/rule`, {
    space_id: spaceId,
    name: body.name,
    type: "automation",
    decision_expr: decisionExpr,
    conditions: body.conditions.map((c, i) => ({
      code: i + 1,
      entity_id: c.entity_id,
      entity_type: "device_report",
      expr: {
        status_code: c.display.code,
        comparator: c.display.operator,
        status_value: c.display.value,
      },
    })),
    actions: body.actions.map((a) => ({
      entity_id: a.entity_id,
      action_executor: a.action_executor === "dpIssue" ? "device_issue" : a.action_executor,
      executor_property: convertActionPropertyToV2(a.executor_property),
    })),
  });
}

export async function toggleAutomation(
  automationId: string,
  enabled: boolean
): Promise<boolean> {
  const spaceId = await getSpaceId();
  return tuyaRequest<boolean>(
    "PUT",
    `/v2.0/cloud/scene/rule/state?space_id=${spaceId}`,
    { ids: automationId, is_enable: enabled }
  );
}

export async function deleteAutomation(
  automationId: string
): Promise<boolean> {
  const spaceId = await getSpaceId();
  return tuyaRequest<boolean>(
    "DELETE",
    `/v2.0/cloud/scene/rule?ids=${automationId}&space_id=${spaceId}`
  );
}

// Helper: convert v1.0 action executor_property { switch_1: true } to v2.0 format
function convertActionPropertyToV2(
  prop: Record<string, unknown>
): { function_code: string; function_value: unknown } {
  const [code, value] = Object.entries(prop)[0];
  return { function_code: code, function_value: value };
}

// === Timer APIs ===

export async function getTimers(deviceId: string): Promise<TuyaTimer[]> {
  return tuyaRequest<TuyaTimer[]>(
    "GET",
    `/v1.0/devices/${deviceId}/timer-tasks`
  );
}

export async function createTimer(
  deviceId: string,
  body: CreateTimerBody
): Promise<unknown> {
  return tuyaRequest("POST", `/v1.0/devices/${deviceId}/timer-tasks`, body);
}

export async function deleteTimer(
  deviceId: string,
  timerId: string
): Promise<boolean> {
  return tuyaRequest<boolean>(
    "DELETE",
    `/v1.0/devices/${deviceId}/timer-tasks/${timerId}`
  );
}

// === Home APIs ===

export async function getHomes(): Promise<TuyaHome[]> {
  const uid = await getUid();
  return tuyaRequest<TuyaHome[]>("GET", `/v1.0/users/${uid}/homes`);
}
