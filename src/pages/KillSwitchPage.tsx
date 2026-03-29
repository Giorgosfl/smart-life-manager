import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TuyaDevice, TuyaRoom, KillSwitchConfig } from "@lib/types";
import {
  devicesGetAll,
  roomsGetAll,
  killSwitchGet,
  killSwitchCreate,
  killSwitchDelete,
} from "@/api/ipc";

type ActionResult<T> = { success: true; data?: T } | { success: false; error: string };

function useDevicesByRoom(devices: TuyaDevice[], rooms: TuyaRoom[]) {
  return useMemo(() => {
    const deviceRoomMap = new Map<string, string>();
    for (const room of rooms) {
      for (const deviceId of room.devices) {
        deviceRoomMap.set(deviceId, room.name);
      }
    }
    const grouped = new Map<string, TuyaDevice[]>();
    for (const device of devices) {
      const roomName = deviceRoomMap.get(device.id) ?? "Other";
      const list = grouped.get(roomName) ?? [];
      list.push(device);
      grouped.set(roomName, list);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => {
      if (a === "Other") return 1;
      if (b === "Other") return -1;
      return a.localeCompare(b);
    });
  }, [devices, rooms]);
}

function ActiveConfig({
  config,
  devices,
  onDelete,
  isDeleting,
}: {
  config: KillSwitchConfig;
  devices: TuyaDevice[];
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const triggerDevice = devices.find((d) => d.id === config.trigger.device_id);
  const excludedDevices = devices.filter((d) =>
    config.excluded_device_ids.includes(d.id)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl" aria-hidden="true">
            🔴
          </span>
          <div>
            <h2 className="text-lg font-semibold">Kill Switch Active</h2>
            <p className="text-sm text-muted">
              Bound to {config.trigger.label}
              {triggerDevice ? ` on ${triggerDevice.name}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Delay</span>
            <span>
              {config.delay_seconds === 0
                ? "Instant"
                : `${config.delay_seconds}s`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Excluded devices</span>
            <span>
              {excludedDevices.length === 0
                ? "None"
                : excludedDevices.length}
            </span>
          </div>
          {excludedDevices.length > 0 && (
            <div className="text-xs text-muted border-t border-card-border pt-2">
              {excludedDevices.map((d) => d.name).join(", ")}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="mt-6 w-full bg-danger text-white rounded-lg px-4 py-2 text-sm transition-colors duration-150 hover:bg-danger-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isDeleting ? "Deleting…" : "Delete Kill Switch"}
        </button>
      </div>
    </div>
  );
}

function SetupForm({
  devices,
  rooms,
  onCreate,
  isCreating,
  error,
}: {
  devices: TuyaDevice[];
  rooms: TuyaRoom[];
  onCreate: (
    trigger: { device_id: string; button_code: string; label: string },
    delaySeconds: number,
    excludedDeviceIds: string[]
  ) => void;
  isCreating: boolean;
  error: string | null;
}) {
  const [triggerKey, setTriggerKey] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const groupedDevices = useDevicesByRoom(devices, rooms);

  // Build room lookup
  const deviceRoomMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const room of rooms) {
      for (const deviceId of room.devices) {
        map.set(deviceId, room.name);
      }
    }
    return map;
  }, [rooms]);

  // Flat list of all buttons across all switch devices
  const allButtons = useMemo(() => {
    const buttons: {
      key: string;
      device_id: string;
      button_code: string;
      device_name: string;
      room: string;
      label: string;
    }[] = [];

    for (const device of devices) {
      if (!device.status) continue;
      // Skip shutters — they can't be trigger buttons
      if (device.category === "cl" || device.category === "clkg") continue;
      const switchStatuses = device.status.filter(
        (s) => s.code.startsWith("switch_") || s.code === "switch"
      );
      if (switchStatuses.length === 0) continue;

      const room = deviceRoomMap.get(device.id) ?? "Other";
      for (const s of switchStatuses) {
        const buttonLabel =
          s.code === "switch"
            ? "Switch"
            : `Button ${s.code.replace("switch_", "")}`;
        buttons.push({
          key: `${device.id}:${s.code}`,
          device_id: device.id,
          button_code: s.code,
          device_name: device.name,
          room,
          label: buttonLabel,
        });
      }
    }

    return buttons.sort((a, b) => a.room.localeCompare(b.room) || a.device_name.localeCompare(b.device_name));
  }, [devices, deviceRoomMap]);

  const selectedButton = allButtons.find((b) => b.key === triggerKey);

  function toggleExclusion(deviceId: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  }

  function handleSubmit() {
    if (!selectedButton) return;
    onCreate(
      {
        device_id: selectedButton.device_id,
        button_code: selectedButton.button_code,
        label: `${selectedButton.device_name} - ${selectedButton.label}`,
      },
      delaySeconds,
      Array.from(excludedIds)
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Trigger Selection */}
      <section className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Trigger Button</h2>
        <p className="text-xs text-muted mb-3">
          Select the button that will activate the kill switch.
        </p>

        <label htmlFor="trigger-select" className="block text-xs text-muted mb-1">
          Button
        </label>
        <select
          id="trigger-select"
          value={triggerKey}
          onChange={(e) => setTriggerKey(e.target.value)}
          className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <option value="">Select a button…</option>
          {Array.from(
            new Set(allButtons.map((b) => b.room))
          ).map((room) => (
            <optgroup key={room} label={room}>
              {allButtons
                .filter((b) => b.room === room)
                .map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.device_name} — {b.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </section>

      {/* Delay */}
      <section className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Delay</h2>
        <p className="text-xs text-muted mb-3">
          How long to wait before shutting everything down (0 = instant).
        </p>
        <div className="flex items-center gap-3">
          <label htmlFor="delay-input" className="sr-only">
            Delay in seconds
          </label>
          <input
            id="delay-input"
            type="number"
            min={0}
            max={300}
            value={delaySeconds}
            onChange={(e) =>
              setDelaySeconds(Math.max(0, parseInt(e.target.value) || 0))
            }
            className="w-24 bg-background border border-card-border rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
          <span className="text-sm text-muted">seconds</span>
        </div>
      </section>

      {/* Exclusions */}
      <section className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Excluded Devices</h2>
        <p className="text-xs text-muted mb-3">
          Check devices you want to keep running when the kill switch activates.
        </p>

        <div className="flex flex-col gap-4">
          {groupedDevices.map(([roomName, roomDevices]) => (
            <div key={roomName}>
              <h3 className="text-xs font-medium text-muted mb-2">
                {roomName}
              </h3>
              <div className="flex flex-col gap-1">
                {roomDevices.map((device) => {
                  // Don't show trigger device in exclusions
                  if (selectedButton && device.id === selectedButton.device_id) return null;
                  return (
                    <label
                      key={device.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background transition-colors duration-150 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={excludedIds.has(device.id)}
                        onChange={() => toggleExclusion(device.id)}
                        className="rounded"
                      />
                      <span className="flex-1 min-w-0 truncate">
                        {device.name}
                      </span>
                      <span
                        className={`text-xs ${device.online ? "text-success" : "text-muted"}`}
                      >
                        {device.online ? "Online" : "Offline"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedButton || isCreating}
        className="w-full bg-danger text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-danger-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {isCreating ? "Creating Kill Switch…" : "Create Kill Switch"}
      </button>
    </div>
  );
}

export default function KillSwitchPage() {
  const queryClient = useQueryClient();

  const { data: devices } = useQuery<TuyaDevice[]>({
    queryKey: ["devices"],
    queryFn: devicesGetAll,
  });

  const { data: rooms } = useQuery<TuyaRoom[]>({
    queryKey: ["rooms"],
    queryFn: roomsGetAll,
  });

  const {
    data: configResult,
    isLoading,
  } = useQuery<ActionResult<KillSwitchConfig | null>>({
    queryKey: ["killswitch"],
    queryFn: killSwitchGet,
  });

  const createMutation = useMutation({
    mutationFn: ({
      trigger,
      delay_seconds,
      excluded_device_ids,
    }: {
      trigger: { device_id: string; button_code: string; label: string };
      delay_seconds: number;
      excluded_device_ids: string[];
    }) => killSwitchCreate(trigger, delay_seconds, excluded_device_ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["killswitch"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => killSwitchDelete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["killswitch"] });
    },
  });

  const config =
    configResult?.success && configResult.data ? configResult.data : null;

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2 text-pretty">Kill Switch</h1>
      <p className="text-sm text-muted mb-6">
        One button to turn off all switches and close all shutters.
      </p>

      {config ? (
        <ActiveConfig
          config={config}
          devices={devices ?? []}
          onDelete={() => deleteMutation.mutate()}
          isDeleting={deleteMutation.isPending}
        />
      ) : (
        <SetupForm
          devices={devices ?? []}
          rooms={rooms ?? []}
          onCreate={(trigger, delay, excluded) =>
            createMutation.mutate({
              trigger,
              delay_seconds: delay,
              excluded_device_ids: excluded,
            })
          }
          isCreating={createMutation.isPending}
          error={
            createMutation.isError
              ? "Failed to create kill switch. Please try again."
              : createMutation.data && !createMutation.data.success
                ? (createMutation.data as { error: string }).error
                : null
          }
        />
      )}
    </div>
  );
}
