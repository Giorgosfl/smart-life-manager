import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

export interface Credentials {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  appUid: string;
}

interface StoreSchema {
  credentials?: {
    clientId: string;
    clientSecretEncrypted: string;
    iv: string;
    tag: string;
    baseUrl: string;
    appUid: string;
  };
}

const APP_DIR = path.join(homedir(), ".smart-life-manager");
const STORE_PATH = path.join(APP_DIR, "config.json");
const KEY_PATH = path.join(APP_DIR, ".encryption-key");

function ensureAppDir(): void {
  if (!fs.existsSync(APP_DIR)) {
    fs.mkdirSync(APP_DIR, { recursive: true, mode: 0o700 });
  }
}

function getOrCreateKey(): Buffer {
  ensureAppDir();
  if (fs.existsSync(KEY_PATH)) {
    return Buffer.from(fs.readFileSync(KEY_PATH, "utf-8"), "hex");
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(KEY_PATH, key.toString("hex"), {
    encoding: "utf-8",
    mode: 0o600,
  });
  return key;
}

function readStore(): StoreSchema {
  ensureAppDir();
  if (!fs.existsSync(STORE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as StoreSchema;
  } catch {
    return {};
  }
}

function writeStore(data: StoreSchema): void {
  ensureAppDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function encryptSecret(secret: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const key = getOrCreateKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(secret, "utf-8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

function decryptSecret(encrypted: string, iv: string, tag: string): string {
  const key = getOrCreateKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

export function hasCredentials(): boolean {
  const store = readStore();
  return store.credentials !== undefined;
}

export function getCredentials(): Credentials | null {
  const store = readStore();
  const creds = store.credentials;
  if (!creds) return null;
  return {
    clientId: creds.clientId,
    clientSecret: decryptSecret(
      creds.clientSecretEncrypted,
      creds.iv,
      creds.tag
    ),
    baseUrl: creds.baseUrl,
    appUid: creds.appUid,
  };
}

export function getCredentialsSafe(): Omit<Credentials, "clientSecret"> | null {
  const store = readStore();
  const creds = store.credentials;
  if (!creds) return null;
  return {
    clientId: creds.clientId,
    baseUrl: creds.baseUrl,
    appUid: creds.appUid,
  };
}

export function setCredentials(creds: Credentials): void {
  const { encrypted, iv, tag } = encryptSecret(creds.clientSecret);
  const store = readStore();
  store.credentials = {
    clientId: creds.clientId,
    clientSecretEncrypted: encrypted,
    iv,
    tag,
    baseUrl: creds.baseUrl,
    appUid: creds.appUid,
  };
  writeStore(store);
}
