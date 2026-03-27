import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TuyaDevice } from "@lib/types";
import {
  devicesGetAll,
  devicesSendCommand,
  devicesRename,
  devicesControlShutter,
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

function getSwitchStatus(device: TuyaDevice): boolean | null {
  if (!device.status) return null;
  const switchStatus = device.status.find((s) => s.code === "switch_1");
  if (switchStatus === undefined) return null;
  return Boolean(switchStatus.value);
}

function DeviceCard({ device }: { device: TuyaDevice }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(device.name);

  const isShutter = device.category === "cl" || device.category === "clkg";
  const switchOn = getSwitchStatus(device);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
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

  function handleToggle() {
    if (switchOn === null) return;
    toggleMutation.mutate({
      deviceId: device.id,
      code: "switch_1",
      value: !switchOn,
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

      {switchOn !== null && (
        <p className="text-xs text-muted">State: {switchOn ? "On" : "Off"}</p>
      )}

      <div className="flex items-center gap-2 mt-auto">
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
        ) : switchOn !== null ? (
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggleMutation.isPending}
            className={`rounded-lg px-4 py-2 text-white text-sm disabled:opacity-50 ${
              switchOn
                ? "bg-danger hover:bg-danger-hover"
                : "bg-primary hover:bg-primary-hover"
            }`}
          >
            {toggleMutation.isPending
              ? "..."
              : switchOn
                ? "Turn Off"
                : "Turn On"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function DevicesPage() {
  const { data, isLoading, isError, error } = useQuery<TuyaDevice[]>({
    queryKey: ["devices"],
    queryFn: devicesGetAll,
  });

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

  const devices = data ?? [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Devices</h1>
      {devices.length === 0 ? (
        <p className="text-muted">No devices found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}
