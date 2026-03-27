import crypto from "crypto";
import { getCredentials } from "../store";
import type {
  TuyaDevice,
  TuyaDeviceFunction,
  TuyaScene,
  TuyaAutomation,
  TuyaTimer,
  TuyaHome,
  CreateAutomationBody,
  CreateSceneBody,
  CreateTimerBody,
} from "@lib/types";

// In-memory caches
let cachedToken: { access_token: string; expires_at: number } | null = null;
let cachedUid: string | null = null;
let cachedHomeId: number | null = null;

export function clearTuyaCaches(): void {
  cachedToken = null;
  cachedUid = null;
  cachedHomeId = null;
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

// === Scene APIs ===

export async function getScenes(): Promise<TuyaScene[]> {
  const homeId = await getHomeId();
  return tuyaRequest<TuyaScene[]>("GET", `/v1.0/homes/${homeId}/scenes`);
}

export async function triggerScene(sceneId: string): Promise<boolean> {
  const homeId = await getHomeId();
  return tuyaRequest<boolean>(
    "POST",
    `/v1.0/homes/${homeId}/scenes/${sceneId}/trigger`
  );
}

export async function createScene(body: CreateSceneBody): Promise<unknown> {
  const homeId = await getHomeId();
  return tuyaRequest("POST", `/v1.0/homes/${homeId}/scenes`, body);
}

export async function deleteScene(sceneId: string): Promise<boolean> {
  const homeId = await getHomeId();
  return tuyaRequest<boolean>(
    "DELETE",
    `/v1.0/homes/${homeId}/scenes/${sceneId}`
  );
}

// === Automation APIs ===

export async function getAutomations(): Promise<TuyaAutomation[]> {
  const homeId = await getHomeId();
  return tuyaRequest<TuyaAutomation[]>(
    "GET",
    `/v1.0/homes/${homeId}/automations`
  );
}

export async function createAutomation(
  body: CreateAutomationBody
): Promise<{ id: string }> {
  const homeId = await getHomeId();
  return tuyaRequest<{ id: string }>(
    "POST",
    `/v1.0/homes/${homeId}/automations`,
    body
  );
}

export async function toggleAutomation(
  automationId: string,
  enabled: boolean
): Promise<boolean> {
  const homeId = await getHomeId();
  return tuyaRequest<boolean>(
    "PUT",
    `/v1.0/homes/${homeId}/automations/${automationId}`,
    { enabled }
  );
}

export async function deleteAutomation(
  automationId: string
): Promise<boolean> {
  const homeId = await getHomeId();
  return tuyaRequest<boolean>(
    "DELETE",
    `/v1.0/homes/${homeId}/automations/${automationId}`
  );
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
