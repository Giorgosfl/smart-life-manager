"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createTimerAction, deleteTimerAction } from "@/lib/actions";
import type { TuyaDevice, TuyaTimer, CreateTimerBody } from "@/lib/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TimersPage() {
  const queryClient = useQueryClient();
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [time, setTime] = useState("08:00");
  const [loops, setLoops] = useState("0000000");
  const [switchValue, setSwitchValue] = useState(true);

  const { data: devices, isLoading: devicesLoading } = useQuery<TuyaDevice[]>({
    queryKey: ["devices"],
    queryFn: async () => {
      const res = await fetch("/api/tuya/devices");
      if (!res.ok) throw new Error("Failed to fetch devices");
      return res.json();
    },
  });

  const {
    data: timers,
    isLoading: timersLoading,
    isError: timersError,
  } = useQuery<TuyaTimer[]>({
    queryKey: ["timers", selectedDeviceId],
    queryFn: async () => {
      const res = await fetch(
        `/api/tuya/devices/${selectedDeviceId}/timers`
      );
      if (!res.ok) throw new Error("Failed to fetch timers");
      return res.json();
    },
    enabled: !!selectedDeviceId,
  });

  const createMutation = useMutation({
    mutationFn: async (body: CreateTimerBody) => {
      const result = await createTimerAction(selectedDeviceId, body);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timers", selectedDeviceId] });
      setTime("08:00");
      setLoops("0000000");
      setSwitchValue(true);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (timerId: string) => {
      const result = await deleteTimerAction(selectedDeviceId, timerId);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timers", selectedDeviceId] });
    },
  });

  function toggleDay(index: number) {
    const chars = loops.split("");
    chars[index] = chars[index] === "1" ? "0" : "1";
    setLoops(chars.join(""));
  }

  function handleCreate() {
    if (!selectedDeviceId) return;
    createMutation.mutate({
      loops,
      time,
      functions: [{ code: "switch_1", value: switchValue }],
    });
  }

  function formatTimerAction(timer: TuyaTimer): string {
    if (!timer.functions || timer.functions.length === 0) return "No action";
    return timer.functions
      .map((f) => `${f.code}: ${f.value ? "ON" : "OFF"}`)
      .join(", ");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Timers</h1>

      {/* Device Selector */}
      <div>
        <label
          htmlFor="device-select"
          className="block text-sm font-medium text-muted mb-1"
        >
          Select Device
        </label>
        <select
          id="device-select"
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
          className="w-full max-w-md rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">
            {devicesLoading ? "Loading devices..." : "-- Choose a device --"}
          </option>
          {devices?.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
      </div>

      {/* Existing Timers */}
      {selectedDeviceId && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Existing Timers
          </h2>

          {timersLoading && (
            <p className="text-sm text-muted">Loading timers...</p>
          )}

          {timersError && (
            <p className="text-sm text-red-500">Failed to load timers.</p>
          )}

          {timers && timers.length === 0 && (
            <p className="text-sm text-muted">
              No timers configured for this device.
            </p>
          )}

          {timers?.map((timer) => (
            <div
              key={timer.id}
              className="bg-card border border-card-border rounded-xl p-4 shadow-sm flex items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <p className="text-xl font-mono font-semibold text-foreground">
                  {timer.time}
                </p>

                <div className="flex gap-1">
                  {DAY_LABELS.map((label, i) => (
                    <span
                      key={label}
                      className={`text-xs font-medium w-8 h-6 flex items-center justify-center rounded ${
                        timer.loops[i] === "1"
                          ? "bg-blue-500 text-white"
                          : "bg-background text-muted"
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-muted">
                  {formatTimerAction(timer)}
                </p>
              </div>

              <button
                onClick={() =>
                  deleteMutation.mutate(timer.timer_id ?? timer.id)
                }
                disabled={deleteMutation.isPending}
                className="shrink-0 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Timer Form */}
      {selectedDeviceId && (
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-semibold text-foreground">
            Create Timer
          </h2>

          {/* Time Picker */}
          <div>
            <label
              htmlFor="timer-time"
              className="block text-sm font-medium text-muted mb-1"
            >
              Time
            </label>
            <input
              id="timer-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Day of Week Toggles */}
          <div>
            <p className="text-sm font-medium text-muted mb-2">
              Days
            </p>
            <div className="flex gap-2">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    loops[i] === "1"
                      ? "bg-blue-500 text-white"
                      : "bg-background border border-card-border text-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Selector */}
          <div>
            <p className="text-sm font-medium text-muted mb-2">
              Action (switch_1)
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSwitchValue(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  switchValue
                    ? "bg-green-500 text-white"
                    : "bg-background border border-card-border text-muted hover:text-foreground"
                }`}
              >
                ON
              </button>
              <button
                type="button"
                onClick={() => setSwitchValue(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !switchValue
                    ? "bg-red-500 text-white"
                    : "bg-background border border-card-border text-muted hover:text-foreground"
                }`}
              >
                OFF
              </button>
            </div>
          </div>

          {/* Submit */}
          {createMutation.isError && (
            <p className="text-sm text-red-500">
              {createMutation.error?.message ?? "Failed to create timer."}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      )}
    </div>
  );
}
