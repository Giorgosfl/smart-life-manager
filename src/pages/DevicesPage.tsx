import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TuyaDevice, TuyaRoom } from "@lib/types";
import {
  devicesGetAll,
  devicesSendCommand,
  devicesRename,
  devicesControlShutter,
  roomsGetAll,
} from "@/api/ipc";

function getCategoryIcon(category: string): string {
  switch (category) {
    case "dj":
    case "dd":
      return "\uD83D\uDCA1";
    case "cl":
    case "clkg":
      return "\uD83E\uDE9F";
    case "kg":
      return "\uD83D\uDD0C";
    default:
      return "\uD83D\uDCF1";
  }
}

function getSwitchStatuses(
  device: TuyaDevice
): { code: string; value: boolean; label: string }[] {
  if (!device.status) return [];
  const switches = device.status
    .filter((s) => s.code.startsWith("switch_") || s.code === "switch")
    .map((s) => ({
      code: s.code,
      value: Boolean(s.value),
      label:
        s.code === "switch"
          ? "Switch"
          : `Button ${s.code.replace("switch_", "")}`,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
  return switches;
}

function DeviceCard({ device }: { device: TuyaDevice }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(device.name);

  const isShutter = device.category === "cl" || device.category === "clkg";
  const switches = getSwitchStatuses(device);

  const toggleMutation = useMutation({
    mutationFn: ({
      deviceId,
      code,
      value,
    }: {
      deviceId: string;
      code: string;
      value: boolean;
    }) => devicesSendCommand(deviceId, [{ code, value }]),
    onMutate: async ({ deviceId, code, value }) => {
      await queryClient.cancelQueries({ queryKey: ["devices"] });
      const previous = queryClient.getQueryData<TuyaDevice[]>(["devices"]);
      queryClient.setQueryData<TuyaDevice[]>(["devices"], (old) =>
        old?.map((d) =>
          d.id === deviceId
            ? {
                ...d,
                status: d.status.map((s) =>
                  s.code === code ? { ...s, value } : s
                ),
              }
            : d
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["devices"], context.previous);
      }
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ deviceId, name }: { deviceId: string; name: string }) =>
      devicesRename(deviceId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  const shutterMutation = useMutation({
    mutationFn: ({
      deviceId,
      action,
    }: {
      deviceId: string;
      action: "open" | "close" | "stop";
    }) => devicesControlShutter(deviceId, action),
  });

  function handleNameSave() {
    setIsEditing(false);
    const trimmed = editName.trim();
    if (trimmed && trimmed !== device.name) {
      renameMutation.mutate({ deviceId: device.id, name: trimmed });
    } else {
      setEditName(device.name);
    }
  }

  function handleToggle(code: string, currentValue: boolean) {
    toggleMutation.mutate({
      deviceId: device.id,
      code,
      value: !currentValue,
    });
  }

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          {getCategoryIcon(device.category)}
        </span>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSave();
                if (e.key === "Escape") {
                  setEditName(device.name);
                  setIsEditing(false);
                }
              }}
              className="w-full bg-transparent border-b border-primary outline-none text-sm font-semibold"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditName(device.name);
                setIsEditing(true);
              }}
              className="text-sm font-semibold truncate text-left w-full hover:underline cursor-text"
              title="Click to rename"
            >
              {device.name}
            </button>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
            device.online
              ? "bg-success/10 text-success"
              : "bg-muted/10 text-muted"
          }`}
        >
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              device.online ? "bg-success" : "bg-muted"
            }`}
          />
          {device.online ? "Online" : "Offline"}
        </span>
      </div>

      {switches.length > 0 && (
        <div className="flex flex-col gap-1">
          {switches.map((sw) => (
            <p key={sw.code} className="text-xs text-muted">
              {switches.length > 1 ? `${sw.label}: ` : "State: "}
              <span className={sw.value ? "text-success" : ""}>
                {sw.value ? "On" : "Off"}
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-auto">
        {isShutter ? (
          <>
            <button
              type="button"
              onClick={() =>
                shutterMutation.mutate({ deviceId: device.id, action: "open" })
              }
              disabled={shutterMutation.isPending}
              className="bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-hover disabled:opacity-50 text-sm"
            >
              Open
            </button>
            <button
              type="button"
              onClick={() =>
                shutterMutation.mutate({ deviceId: device.id, action: "close" })
              }
              disabled={shutterMutation.isPending}
              className="bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-hover disabled:opacity-50 text-sm"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() =>
                shutterMutation.mutate({ deviceId: device.id, action: "stop" })
              }
              disabled={shutterMutation.isPending}
              className="bg-danger text-white rounded-lg px-4 py-2 hover:bg-danger-hover disabled:opacity-50 text-sm"
            >
              Stop
            </button>
          </>
        ) : switches.length > 0 ? (
          switches.map((sw) => (
            <button
              key={sw.code}
              type="button"
              onClick={() => handleToggle(sw.code, sw.value)}
              disabled={toggleMutation.isPending}
              className={`rounded-lg px-4 py-2 text-white text-sm disabled:opacity-50 ${
                sw.value
                  ? "bg-danger hover:bg-danger-hover"
                  : "bg-primary hover:bg-primary-hover"
              }`}
            >
              {switches.length > 1 ? `${sw.label} ` : ""}
              {sw.value ? "Off" : "On"}
            </button>
          ))
        ) : null}
      </div>
    </div>
  );
}

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

    // Sort: named rooms alphabetically, "Other" last
    return Array.from(grouped.entries()).sort(([a], [b]) => {
      if (a === "Other") return 1;
      if (b === "Other") return -1;
      return a.localeCompare(b);
    });
  }, [devices, rooms]);
}

export default function DevicesPage() {
  const { data, isLoading, isError, error } = useQuery<TuyaDevice[]>({
    queryKey: ["devices"],
    queryFn: devicesGetAll,
  });

  const { data: rooms } = useQuery<TuyaRoom[]>({
    queryKey: ["rooms"],
    queryFn: roomsGetAll,
  });

  const devices = data ?? [];
  const groupedDevices = useDevicesByRoom(devices, rooms ?? []);

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted">Loading devices...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <p className="text-danger">
          Error loading devices:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Devices</h1>
      {devices.length === 0 ? (
        <p className="text-muted">No devices found.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {groupedDevices.map(([roomName, roomDevices]) => (
            <section key={roomName}>
              <h2 className="text-lg font-semibold mb-3 text-muted">{roomName}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roomDevices.map((device) => (
                  <DeviceCard key={device.id} device={device} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
