import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  TuyaDevice,
  TuyaDeviceFunction,
  MirrorButton,
  MirrorGroup,
  MirrorGroupsData,
} from "@lib/types";
import {
  devicesGetAll,
  devicesGetFunctions,
  mirrorsGetAll,
  mirrorsCreate,
  mirrorsDelete,
} from "@/api/ipc";

interface DeviceFunctionsCache {
  [deviceId: string]: {
    loading: boolean;
    error: string | null;
    functions: TuyaDeviceFunction[];
  };
}

function StepIndicator({ currentStep, onStepClick }: { currentStep: number; onStepClick: (step: number) => void }) {
  const steps = [
    { num: 1, label: "Main Button" },
    { num: 2, label: "Mirror Buttons" },
    { num: 3, label: "Name & Preview" },
  ];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, idx) => (
        <div key={step.num} className="flex items-center gap-2">
          <button type="button" onClick={() => { if (step.num < currentStep) onStepClick(step.num); }} disabled={step.num > currentStep}
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${step.num === currentStep ? "bg-primary text-white" : step.num < currentStep ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30" : "bg-card-border text-muted"}`}>
            {step.num}
          </button>
          <span className={`text-sm font-medium ${step.num === currentStep ? "text-foreground" : "text-muted"}`}>{step.label}</span>
          {idx < steps.length - 1 && <div className="w-8 h-px bg-card-border mx-1" />}
        </div>
      ))}
    </div>
  );
}

function DeviceButtonPicker({ device, functionsCache, onExpand, selectedButtons, onToggleButton, mode, disabledButton }: {
  device: TuyaDevice; functionsCache: DeviceFunctionsCache; onExpand: (deviceId: string) => void;
  selectedButtons: MirrorButton[]; onToggleButton: (btn: MirrorButton) => void;
  mode: "radio" | "checkbox"; disabledButton?: MirrorButton | null;
}) {
  const cache = functionsCache[device.id];
  const isExpanded = cache !== undefined;
  const isLoading = cache?.loading ?? false;
  const booleanFunctions = (cache?.functions ?? []).filter((f) => f.type === "Boolean");

  function isDisabled(code: string) { return disabledButton?.device_id === device.id && disabledButton?.button_code === code; }
  function isSelected(code: string) { return selectedButtons.some((b) => b.device_id === device.id && b.button_code === code); }

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <button type="button" onClick={() => onExpand(device.id)} className="w-full flex items-center justify-between p-4 text-left hover:bg-background/50 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${device.online ? "bg-success" : "bg-muted"}`} />
          <span className="font-medium text-sm truncate">{device.name}</span>
        </div>
        <svg className={`w-4 h-4 text-muted transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="border-t border-card-border px-4 py-3 flex flex-col gap-2">
          {isLoading && <p className="text-xs text-muted">Loading functions...</p>}
          {cache?.error && <p className="text-xs text-danger">{cache.error}</p>}
          {!isLoading && !cache?.error && booleanFunctions.length === 0 && <p className="text-xs text-muted">No Boolean buttons found on this device.</p>}
          {booleanFunctions.map((fn) => {
            const label = `${device.name} - ${fn.code}`;
            const btn: MirrorButton = { device_id: device.id, button_code: fn.code, label };
            const disabled = isDisabled(fn.code);
            const selected = isSelected(fn.code);
            return (
              <label key={fn.code} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${disabled ? "opacity-40 cursor-not-allowed border-card-border bg-card" : selected ? "border-primary bg-primary/10" : "border-card-border hover:border-primary/40 hover:bg-background/50"}`}>
                <input type={mode} name={mode === "radio" ? "main-button" : undefined} checked={selected} disabled={disabled} onChange={() => { if (!disabled) onToggleButton(btn); }} className="accent-primary w-4 h-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{fn.name || fn.code}</span>
                  <span className="text-xs text-muted">{fn.code}</span>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MirrorGroupCard({ group, onDelete, isDeleting }: { group: MirrorGroup; onDelete: (id: string) => void; isDeleting: boolean }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{group.name}</h3>
        <span className="text-xs text-muted">{group.automation_ids.length} automations</span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted">Main button:</p>
        <p className="text-sm font-medium pl-2">{group.main.label}</p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted">Mirrored buttons ({group.mirrors.length}):</p>
        <ul className="pl-2 flex flex-col gap-0.5">
          {group.mirrors.map((m) => (<li key={`${m.device_id}-${m.button_code}`} className="text-sm">{m.label}</li>))}
        </ul>
      </div>
      <button type="button" onClick={() => onDelete(group.id)} disabled={isDeleting} className="mt-auto self-start bg-danger text-white rounded-lg px-4 py-2 text-sm hover:bg-danger/90 disabled:opacity-50">
        {isDeleting ? "Deleting..." : "Delete Group"}
      </button>
    </div>
  );
}

export default function MirrorsPage() {
  const [groups, setGroups] = useState<MirrorGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [mainButton, setMainButton] = useState<MirrorButton | null>(null);
  const [mirrors, setMirrors] = useState<MirrorButton[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [functionsCache, setFunctionsCache] = useState<DeviceFunctionsCache>({});

  const { data: devices, isLoading: devicesLoading, isError: devicesError } = useQuery<TuyaDevice[]>({
    queryKey: ["devices"],
    queryFn: devicesGetAll,
  });

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    setGroupsError(null);
    const result = await mirrorsGetAll();
    if (result.success && result.data) {
      setGroups(result.data.groups);
    } else if (!result.success) {
      setGroupsError(result.error);
    }
    setGroupsLoading(false);
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  function handleExpandDevice(deviceId: string) {
    if (functionsCache[deviceId]) {
      setFunctionsCache((prev) => { const next = { ...prev }; delete next[deviceId]; return next; });
      return;
    }
    setFunctionsCache((prev) => ({ ...prev, [deviceId]: { loading: true, error: null, functions: [] } }));
    devicesGetFunctions(deviceId)
      .then((fns) => { setFunctionsCache((prev) => ({ ...prev, [deviceId]: { loading: false, error: null, functions: fns } })); })
      .catch((err) => { setFunctionsCache((prev) => ({ ...prev, [deviceId]: { loading: false, error: err instanceof Error ? err.message : "Error", functions: [] } })); });
  }

  function handleSelectMain(btn: MirrorButton) {
    setMainButton(btn);
    setMirrors((prev) => prev.filter((m) => !(m.device_id === btn.device_id && m.button_code === btn.button_code)));
  }

  function handleToggleMirror(btn: MirrorButton) {
    setMirrors((prev) => {
      const exists = prev.some((m) => m.device_id === btn.device_id && m.button_code === btn.button_code);
      if (exists) return prev.filter((m) => !(m.device_id === btn.device_id && m.button_code === btn.button_code));
      return [...prev, btn];
    });
  }

  async function handleDeleteGroup(groupId: string) {
    setDeletingId(groupId);
    const result = await mirrorsDelete(groupId);
    if (result.success) await loadGroups();
    setDeletingId(null);
  }

  async function handleSubmit() {
    if (!mainButton || mirrors.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    const name = groupName.trim() || `Mirror: ${mainButton.label}`;
    const result = await mirrorsCreate(name, mainButton, mirrors);
    if (result.success) {
      setStep(1); setMainButton(null); setMirrors([]); setGroupName(""); setFunctionsCache({});
      await loadGroups();
    } else if (!result.success) { setSubmitError(result.error); }
    setIsSubmitting(false);
  }

  function resetForm() { setStep(1); setMainButton(null); setMirrors([]); setGroupName(""); setSubmitError(null); setFunctionsCache({}); }

  const automationCount = mirrors.length * 4;
  const deviceList = devices ?? [];

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Mirror Groups</h1>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Existing Groups</h2>
        {groupsLoading && <p className="text-muted text-sm">Loading groups...</p>}
        {groupsError && <p className="text-danger text-sm">Error: {groupsError}</p>}
        {!groupsLoading && !groupsError && groups.length === 0 && <p className="text-muted text-sm">No mirror groups yet. Create one below.</p>}
        {groups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (<MirrorGroupCard key={group.id} group={group} onDelete={handleDeleteGroup} isDeleting={deletingId === group.id} />))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Mirror Group</h2>
          {step > 1 && <button type="button" onClick={resetForm} className="text-sm text-muted hover:text-foreground transition-colors">Reset</button>}
        </div>
        <StepIndicator currentStep={step} onStepClick={setStep} />

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">Select the main button. When this button changes state, all mirrored buttons will follow.</p>
            {devicesLoading && <p className="text-muted text-sm">Loading devices...</p>}
            {devicesError && <p className="text-danger text-sm">Failed to load devices.</p>}
            <div className="flex flex-col gap-2">
              {deviceList.map((device) => (<DeviceButtonPicker key={device.id} device={device} functionsCache={functionsCache} onExpand={handleExpandDevice} selectedButtons={mainButton ? [mainButton] : []} onToggleButton={handleSelectMain} mode="radio" />))}
            </div>
            <div className="flex justify-end mt-2">
              <button type="button" disabled={!mainButton} onClick={() => setStep(2)} className="bg-primary text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">Select buttons that should mirror the main button (<span className="font-medium text-foreground">{mainButton?.label}</span>). Check any combination.</p>
            <div className="flex flex-col gap-2">
              {deviceList.map((device) => (<DeviceButtonPicker key={device.id} device={device} functionsCache={functionsCache} onExpand={handleExpandDevice} selectedButtons={mirrors} onToggleButton={handleToggleMirror} mode="checkbox" disabledButton={mainButton} />))}
            </div>
            <div className="flex justify-between mt-2">
              <button type="button" onClick={() => setStep(1)} className="text-sm text-muted hover:text-foreground transition-colors px-4 py-2">Back</button>
              <button type="button" disabled={mirrors.length === 0} onClick={() => setStep(3)} className="bg-primary text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="group-name" className="block text-sm font-medium mb-1">Group Name (optional)</label>
              <input id="group-name" type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder={`Mirror: ${mainButton?.label ?? ""}`} className="w-full bg-card border border-card-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors" />
            </div>
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-warning">Preview</h3>
              <div className="flex flex-col gap-1 text-sm">
                <p><span className="text-muted">Main:</span> <span className="font-medium">{mainButton?.label}</span></p>
                <p><span className="text-muted">Mirrors:</span></p>
                <ul className="pl-4 list-disc">{mirrors.map((m) => (<li key={`${m.device_id}-${m.button_code}`}>{m.label}</li>))}</ul>
              </div>
              <p className="text-sm font-medium">This will create <span className="text-warning font-bold">{automationCount}</span> automations in Smart Life.</p>
            </div>
            {submitError && <p className="text-danger text-sm">Error: {submitError}</p>}
            <div className="flex justify-between mt-2">
              <button type="button" onClick={() => setStep(2)} className="text-sm text-muted hover:text-foreground transition-colors px-4 py-2">Back</button>
              <button type="button" disabled={isSubmitting} onClick={handleSubmit} className="bg-primary text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
                {isSubmitting ? "Creating..." : "Create Mirror Group"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
