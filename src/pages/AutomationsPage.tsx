import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TuyaAutomation, TuyaDevice, CreateAutomationBody } from "@lib/types";
import {
  automationsGetAll,
  automationsCreate,
  automationsToggle,
  automationsDelete,
  devicesGetAll,
} from "@/api/ipc";

function AutomationCard({ automation }: { automation: TuyaAutomation }) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: ({ automationId, enabled }: { automationId: string; enabled: boolean }) =>
      automationsToggle(automationId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (automationId: string) => automationsDelete(automationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });

  function handleToggle() {
    toggleMutation.mutate({ automationId: automation.id, enabled: !automation.enabled });
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteMutation.mutate(automation.id);
    setConfirmDelete(false);
  }

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold truncate flex-1">{automation.name}</h3>
        <button
          type="button"
          role="switch"
          aria-checked={automation.enabled}
          aria-label={`${automation.enabled ? "Disable" : "Enable"} ${automation.name}`}
          onClick={handleToggle}
          disabled={toggleMutation.isPending}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 ${
            automation.enabled ? "bg-primary" : "bg-muted/30"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
              automation.enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      <p className="text-xs text-muted">
        Status: {automation.enabled ? "Enabled" : "Disabled"}
      </p>
      {automation.conditions.length > 0 && (
        <p className="text-xs text-muted">
          Conditions: {automation.conditions.length} | Actions: {automation.actions.length} |
          Match: {automation.match_type === 1 ? "All" : "Any"}
        </p>
      )}
      <div className="flex items-center gap-2 mt-auto">
        {confirmDelete ? (
          <>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-danger text-white rounded-lg px-4 py-2 hover:bg-danger-hover disabled:opacity-50 text-sm"
            >
              {deleteMutation.isPending ? "..." : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="bg-muted/20 text-muted rounded-lg px-4 py-2 hover:bg-muted/30 text-sm"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleDelete}
            className="bg-danger text-white rounded-lg px-4 py-2 hover:bg-danger-hover text-sm"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function CreateAutomationForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [conditionDeviceId, setConditionDeviceId] = useState("");
  const [conditionValue, setConditionValue] = useState("true");
  const [actionDeviceId, setActionDeviceId] = useState("");
  const [actionValue, setActionValue] = useState("true");
  const [matchType, setMatchType] = useState<1 | 2>(1);

  const { data: devices } = useQuery<TuyaDevice[]>({
    queryKey: ["devices"],
    queryFn: devicesGetAll,
  });

  const createMutation = useMutation({
    mutationFn: (body: CreateAutomationBody) => automationsCreate(body),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["automations"] });
        setName("");
        setConditionDeviceId("");
        setConditionValue("true");
        setActionDeviceId("");
        setActionValue("true");
        setMatchType(1);
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !conditionDeviceId || !actionDeviceId) return;
    const body: CreateAutomationBody = {
      name: name.trim(),
      conditions: [
        {
          entity_id: conditionDeviceId,
          entity_type: 1,
          display: { code: "switch_1", operator: "==", value: conditionValue === "true" },
        },
      ],
      actions: [
        {
          entity_id: actionDeviceId,
          action_executor: "dpIssue",
          executor_property: { switch_1: actionValue === "true" },
        },
      ],
      match_type: matchType,
    };
    createMutation.mutate(body);
  }

  const deviceList = devices ?? [];

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Create Automation</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="automation-name" className="text-sm font-medium">Automation Name</label>
          <input id="automation-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="My automation" required className="rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <fieldset className="flex flex-col gap-2 border border-card-border rounded-lg p-3">
          <legend className="text-sm font-medium px-1">When (Condition)</legend>
          <div className="flex flex-col gap-1">
            <label htmlFor="condition-device" className="text-xs text-muted">Device</label>
            <select id="condition-device" value={conditionDeviceId} onChange={(e) => setConditionDeviceId(e.target.value)} required className="rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary">
              <option value="">Select device...</option>
              {deviceList.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="condition-state" className="text-xs text-muted">switch_1 state</label>
            <select id="condition-state" value={conditionValue} onChange={(e) => setConditionValue(e.target.value)} className="rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary">
              <option value="true">ON</option>
              <option value="false">OFF</option>
            </select>
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2 border border-card-border rounded-lg p-3">
          <legend className="text-sm font-medium px-1">Then (Action)</legend>
          <div className="flex flex-col gap-1">
            <label htmlFor="action-device" className="text-xs text-muted">Device</label>
            <select id="action-device" value={actionDeviceId} onChange={(e) => setActionDeviceId(e.target.value)} required className="rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary">
              <option value="">Select device...</option>
              {deviceList.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="action-state" className="text-xs text-muted">switch_1 action</label>
            <select id="action-state" value={actionValue} onChange={(e) => setActionValue(e.target.value)} className="rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary">
              <option value="true">ON</option>
              <option value="false">OFF</option>
            </select>
          </div>
        </fieldset>
        <div className="flex flex-col gap-1">
          <label htmlFor="match-type" className="text-sm font-medium">Match Type</label>
          <select id="match-type" value={matchType} onChange={(e) => setMatchType(Number(e.target.value) as 1 | 2)} className="rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary">
            <option value={1}>All conditions (AND)</option>
            <option value={2}>Any condition (OR)</option>
          </select>
        </div>
        {createMutation.data && !createMutation.data.success && (
          <p className="text-danger text-sm">{createMutation.data.error}</p>
        )}
        <button type="submit" disabled={createMutation.isPending || !name.trim() || !conditionDeviceId || !actionDeviceId} className="bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-hover disabled:opacity-50 text-sm font-medium">
          {createMutation.isPending ? "Creating..." : "Create"}
        </button>
      </form>
    </div>
  );
}

export default function AutomationsPage() {
  const { data, isLoading, isError, error } = useQuery<TuyaAutomation[]>({
    queryKey: ["automations"],
    queryFn: automationsGetAll,
  });

  if (isLoading) return <div className="p-6"><p className="text-muted">Loading automations...</p></div>;
  if (isError) return <div className="p-6"><p className="text-danger">Error: {error instanceof Error ? error.message : "Unknown"}</p></div>;

  const automations = data ?? [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Automations</h1>
      <div className="mb-8"><CreateAutomationForm /></div>
      {automations.length === 0 ? (
        <p className="text-muted">No automations found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {automations.map((a) => (<AutomationCard key={a.id} automation={a} />))}
        </div>
      )}
    </div>
  );
}
