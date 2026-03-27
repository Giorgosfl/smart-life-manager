"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  triggerSceneAction,
  createSceneAction,
  deleteSceneAction,
} from "@/lib/actions";
import type { TuyaScene, TuyaDevice } from "@/lib/types";

interface ActionRow {
  entity_id: string;
  value: boolean;
}

export default function ScenesPage() {
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sceneName, setSceneName] = useState("");
  const [actionRows, setActionRows] = useState<ActionRow[]>([
    { entity_id: "", value: true },
  ]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const {
    data: scenes,
    isLoading: scenesLoading,
    error: scenesError,
  } = useQuery<TuyaScene[]>({
    queryKey: ["scenes"],
    queryFn: async () => {
      const res = await fetch("/api/tuya/scenes");
      if (!res.ok) throw new Error("Failed to fetch scenes");
      return res.json();
    },
  });

  const {
    data: devices,
    isLoading: devicesLoading,
  } = useQuery<TuyaDevice[]>({
    queryKey: ["devices"],
    queryFn: async () => {
      const res = await fetch("/api/tuya/devices");
      if (!res.ok) throw new Error("Failed to fetch devices");
      return res.json();
    },
    enabled: showCreateForm,
  });

  const triggerMutation = useMutation({
    mutationFn: (sceneId: string) => triggerSceneAction(sceneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (sceneId: string) => deleteSceneAction(sceneId),
    onSuccess: () => {
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ["scenes"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const actions = actionRows
        .filter((row) => row.entity_id !== "")
        .map((row) => ({
          entity_id: row.entity_id,
          action_executor: "dpIssue" as const,
          executor_property: { switch_1: row.value } as Record<string, unknown>,
        }));
      return createSceneAction(sceneName, actions);
    },
    onSuccess: (result) => {
      if (result.success) {
        setSceneName("");
        setActionRows([{ entity_id: "", value: true }]);
        setShowCreateForm(false);
        queryClient.invalidateQueries({ queryKey: ["scenes"] });
      }
    },
  });

  function addActionRow() {
    setActionRows((prev) => [...prev, { entity_id: "", value: true }]);
  }

  function updateActionRow(index: number, updates: Partial<ActionRow>) {
    setActionRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row))
    );
  }

  function removeActionRow(index: number) {
    setActionRows((prev) => prev.filter((_, i) => i !== index));
  }

  const canCreate =
    sceneName.trim() !== "" &&
    actionRows.some((row) => row.entity_id !== "") &&
    !createMutation.isPending;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scenes</h1>
        <button
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showCreateForm ? "Cancel" : "Create Scene"}
        </button>
      </div>

      {/* Create Scene Form */}
      {showCreateForm && (
        <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">New Scene</h2>

          <div>
            <label
              htmlFor="scene-name"
              className="block text-sm font-medium mb-1"
            >
              Scene Name
            </label>
            <input
              id="scene-name"
              type="text"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              placeholder="e.g. All Lights On"
              className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Actions</p>

            {actionRows.map((row, index) => (
              <div key={index} className="flex items-center gap-3">
                <select
                  value={row.entity_id}
                  onChange={(e) =>
                    updateActionRow(index, { entity_id: e.target.value })
                  }
                  className="flex-1 rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select device...</option>
                  {devicesLoading && <option disabled>Loading...</option>}
                  {devices?.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name}
                    </option>
                  ))}
                </select>

                <select
                  value={row.value ? "on" : "off"}
                  onChange={(e) =>
                    updateActionRow(index, { value: e.target.value === "on" })
                  }
                  className="rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="on">Turn On</option>
                  <option value="off">Turn Off</option>
                </select>

                {actionRows.length > 1 && (
                  <button
                    onClick={() => removeActionRow(index)}
                    className="text-danger hover:opacity-80 text-sm font-medium px-2 py-1"
                    aria-label="Remove action"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={addActionRow}
              className="text-sm font-medium text-primary hover:opacity-80 transition-opacity"
            >
              + Add Action
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!canCreate}
              className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
            {createMutation.isError && (
              <p className="text-sm text-danger">Failed to create scene.</p>
            )}
          </div>
        </div>
      )}

      {/* Scene List */}
      {scenesLoading && (
        <p className="text-sm text-muted-foreground">Loading scenes...</p>
      )}

      {scenesError && (
        <p className="text-sm text-danger">
          Failed to load scenes. Please try again.
        </p>
      )}

      {scenes && scenes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No scenes found. Create one to get started.
        </p>
      )}

      {scenes && scenes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenes.map((scene) => (
            <div
              key={scene.scene_id}
              className="bg-card border border-card-border rounded-xl p-4 shadow-sm space-y-3"
            >
              <h3 className="font-semibold text-base truncate">{scene.name}</h3>

              {scene.actions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {scene.actions.length} action
                  {scene.actions.length !== 1 ? "s" : ""}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerMutation.mutate(scene.scene_id)}
                  disabled={triggerMutation.isPending}
                  className="bg-success text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {triggerMutation.isPending &&
                  triggerMutation.variables === scene.scene_id
                    ? "Triggering..."
                    : "Trigger"}
                </button>

                {deleteConfirmId === scene.scene_id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        deleteMutation.mutate(scene.scene_id)
                      }
                      disabled={deleteMutation.isPending}
                      className="bg-danger text-white rounded-lg px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {deleteMutation.isPending ? "Deleting..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="rounded-lg border border-card-border px-3 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(scene.scene_id)}
                    className="bg-danger text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
