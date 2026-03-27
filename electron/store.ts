import { safeStorage } from "electron";
import Store from "electron-store";

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
    secretEncoding: "safeStorage" | "base64";
    baseUrl: string;
    appUid: string;
  };
}

const store = new Store<StoreSchema>();

function encryptSecret(secret: string): { encrypted: string; encoding: "safeStorage" | "base64" } {
  if (safeStorage.isEncryptionAvailable()) {
    return {
      encrypted: safeStorage.encryptString(secret).toString("hex"),
      encoding: "safeStorage",
    };
  }
  return {
    encrypted: Buffer.from(secret, "utf-8").toString("base64"),
    encoding: "base64",
  };
}

function decryptSecret(encrypted: string, encoding: "safeStorage" | "base64"): string {
  if (encoding === "safeStorage") {
    return safeStorage.decryptString(Buffer.from(encrypted, "hex"));
  }
  return Buffer.from(encrypted, "base64").toString("utf-8");
}

export function hasCredentials(): boolean {
  return store.has("credentials");
}

export function getCredentials(): Credentials | null {
  const creds = store.get("credentials");
  if (!creds) return null;
  return {
    clientId: creds.clientId,
    clientSecret: decryptSecret(
      creds.clientSecretEncrypted,
      creds.secretEncoding ?? "base64"
    ),
    baseUrl: creds.baseUrl,
    appUid: creds.appUid,
  };
}

export function getCredentialsSafe(): Omit<Credentials, "clientSecret"> | null {
  const creds = store.get("credentials");
  if (!creds) return null;
  return {
    clientId: creds.clientId,
    baseUrl: creds.baseUrl,
    appUid: creds.appUid,
  };
}

export function setCredentials(creds: Credentials): void {
  const { encrypted, encoding } = encryptSecret(creds.clientSecret);
  store.set("credentials", {
    clientId: creds.clientId,
    clientSecretEncrypted: encrypted,
    secretEncoding: encoding,
    baseUrl: creds.baseUrl,
    appUid: creds.appUid,
  });
}
