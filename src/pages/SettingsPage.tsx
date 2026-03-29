import { useState, useEffect } from "react";
import {
  credentialsGet,
  credentialsSet,
  devicesGetAll,
  devicesGetAllUnfiltered,
  hiddenDevicesGet,
  hiddenDevicesSet,
} from "@/api/ipc";
import type { TuyaDevice } from "@lib/types";

function HiddenDevicesSection() {
  const [allDevices, setAllDevices] = useState<TuyaDevice[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([devicesGetAllUnfiltered(), hiddenDevicesGet()]).then(
      ([devices, ids]) => {
        setAllDevices(devices);
        setHiddenIds(new Set(ids));
        setLoaded(true);
      }
    );
  }, []);

  function toggleDevice(id: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    await hiddenDevicesSet(Array.from(hiddenIds));
    setSaving(false);
  }

  if (!loaded) return null;

  return (
    <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Hidden Devices</h2>
        <p className="text-xs text-muted mt-1">
          Hidden devices won't appear anywhere in the app.
        </p>
      </div>

      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
        {allDevices.map((device) => (
          <label
            key={device.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background transition-colors duration-150 cursor-pointer text-sm"
          >
            <input
              type="checkbox"
              checked={hiddenIds.has(device.id)}
              onChange={() => toggleDevice(device.id)}
              className="rounded"
            />
            <span className="flex-1 min-w-0 truncate">{device.name}</span>
            <span className="text-xs text-muted">{device.category}</span>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

const BASE_URL_OPTIONS = [
  { label: "Central Europe", value: "https://openapi.tuyaeu.com" },
  { label: "Western Europe", value: "https://openapi-weaz.tuyaeu.com" },
  { label: "Eastern America", value: "https://openapi.tuyaus.com" },
  { label: "Western America", value: "https://openapi-ueaz.tuyaus.com" },
  { label: "China", value: "https://openapi.tuyacn.com" },
  { label: "India", value: "https://openapi.tuyain.com" },
];

export default function SettingsPage() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://openapi.tuyaeu.com");
  const [appUid, setAppUid] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "testing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    credentialsGet().then((creds) => {
      if (creds) {
        setClientId(creds.clientId);
        setBaseUrl(creds.baseUrl);
        setAppUid(creds.appUid);
      }
      setLoaded(true);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId.trim()) return;

    setStatus("saving");
    setMessage("");

    // If secret is empty, user doesn't want to change it
    if (!clientSecret.trim()) {
      setMessage("Enter the Client Secret to update credentials.");
      setStatus("error");
      return;
    }

    const result = await credentialsSet({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      baseUrl,
      appUid: appUid.trim(),
    });

    if (!result.success) {
      setMessage(result.error);
      setStatus("error");
      return;
    }

    setMessage("Credentials saved successfully.");
    setStatus("success");
    setClientSecret("");
  }

  async function handleTestConnection() {
    setStatus("testing");
    setMessage("");
    try {
      const devices = await devicesGetAll();
      setMessage(`Connection successful! Found ${devices.length} device(s).`);
      setStatus("success");
    } catch (err) {
      setMessage(
        `Connection failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setStatus("error");
    }
  }

  if (!loaded) {
    return (
      <div className="p-6">
        <p className="text-muted">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <HiddenDevicesSection />

      <div className="bg-card border border-card-border rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold">Tuya Cloud Credentials</h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="s-clientId" className="text-sm font-medium">
              Client ID
            </label>
            <input
              id="s-clientId"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="s-clientSecret" className="text-sm font-medium">
              Client Secret
            </label>
            <input
              id="s-clientSecret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Enter new secret to update"
              className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted">
              Leave blank to keep the existing secret.
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="s-baseUrl" className="text-sm font-medium">
              Data Center Region
            </label>
            <select
              id="s-baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {BASE_URL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="s-appUid" className="text-sm font-medium">
              App UID
            </label>
            <input
              id="s-appUid"
              type="text"
              value={appUid}
              onChange={(e) => setAppUid(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {message && (
            <p
              className={`text-sm rounded-lg p-3 ${
                status === "success"
                  ? "text-success bg-success/10"
                  : "text-danger bg-danger/10"
              }`}
            >
              {message}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={status === "saving" || !clientId.trim()}
              className="bg-primary text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {status === "saving" ? "Saving..." : "Save Credentials"}
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={status === "testing"}
              className="border border-card-border rounded-lg px-5 py-2 text-sm font-medium hover:bg-background transition-colors disabled:opacity-50"
            >
              {status === "testing" ? "Testing..." : "Test Connection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
