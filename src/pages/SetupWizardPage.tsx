import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { credentialsSet, devicesGetAll } from "@/api/ipc";

const BASE_URL_OPTIONS = [
  { label: "Central Europe", value: "https://openapi.tuyaeu.com" },
  { label: "Western Europe", value: "https://openapi-weaz.tuyaeu.com" },
  { label: "Eastern America", value: "https://openapi.tuyaus.com" },
  { label: "Western America", value: "https://openapi-ueaz.tuyaus.com" },
  { label: "China", value: "https://openapi.tuyacn.com" },
  { label: "India", value: "https://openapi.tuyain.com" },
];

export default function SetupWizardPage() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://openapi.tuyaeu.com");
  const [appUid, setAppUid] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "testing" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim() || !appUid.trim()) return;

    setStatus("saving");
    setError("");

    const result = await credentialsSet({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      baseUrl,
      appUid: appUid.trim(),
    });

    if (!result.success) {
      setError(result.error);
      setStatus("error");
      return;
    }

    setStatus("testing");
    try {
      await devicesGetAll();
      navigate("/devices");
    } catch (err) {
      setError(
        `Credentials saved but connection failed: ${err instanceof Error ? err.message : "Unknown error"}. You can fix them in Settings.`
      );
      setStatus("error");
    }
  }

  function handleSkip() {
    navigate("/settings");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Smart Life Manager
          </h1>
          <p className="text-muted text-sm">
            Connect to your Tuya Cloud account to get started.
          </p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold">Setup Credentials</h2>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium text-primary">How to get these values:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted">
              <li>
                Go to{" "}
                <span className="font-mono text-foreground">platform.tuya.com</span>{" "}
                and sign in
              </li>
              <li>Create a Cloud Project (or open an existing one)</li>
              <li>
                <strong>Client ID</strong> &amp; <strong>Client Secret</strong> are on the
                Project Overview page
              </li>
              <li>
                <strong>Base URL</strong> depends on your data center region
                (selected below)
              </li>
              <li>
                <strong>App UID</strong>: Go to Devices &rarr; Link App Account
                &rarr; copy the UID column
              </li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="clientId" className="text-sm font-medium">
                Client ID <span className="text-danger">*</span>
              </label>
              <input
                id="clientId"
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. c7ppxacn8s8wmsfgnvgq"
                required
                className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="clientSecret" className="text-sm font-medium">
                Client Secret <span className="text-danger">*</span>
              </label>
              <input
                id="clientSecret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Your client secret"
                required
                className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="baseUrl" className="text-sm font-medium">
                Data Center Region <span className="text-danger">*</span>
              </label>
              <select
                id="baseUrl"
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
              <label htmlFor="appUid" className="text-sm font-medium">
                App UID <span className="text-danger">*</span>
              </label>
              <input
                id="appUid"
                type="text"
                value={appUid}
                onChange={(e) => setAppUid(e.target.value)}
                placeholder="e.g. eu1691772007956SzRAd"
                required
                className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && (
              <p className="text-sm text-danger bg-danger/10 rounded-lg p-3">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={
                  status === "saving" ||
                  status === "testing" ||
                  !clientId.trim() ||
                  !clientSecret.trim() ||
                  !appUid.trim()
                }
                className="bg-primary text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {status === "saving"
                  ? "Saving..."
                  : status === "testing"
                    ? "Testing connection..."
                    : "Save & Connect"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
