import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { app } from "electron";

import {
  sendCommand,
  renameDevice,
  triggerScene,
  createScene,
  deleteScene,
  createAutomation,
  toggleAutomation,
  deleteAutomation,
  createTimer,
  deleteTimer,
} from "./tuya";

import type {
  CreateAutomationBody,
  CreateTimerBody,
  MirrorButton,
  MirrorGroup,
  MirrorGroupsData,
} from "@lib/types";

export type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: string };

const MIRRORS_PATH = path.join(app.getPath("userData"), "mirrors.json");

async function ensureMirrorsFile(): Promise<void> {
  try {
    await fs.access(MIRRORS_PATH);
  } catch {
    await fs.mkdir(path.dirname(MIRRORS_PATH), { recursive: true });
    await fs.writeFile(
      MIRRORS_PATH,
      JSON.stringify({ groups: [] }, null, 2),
      "utf-8"
    );
  }
}

// === Device Actions ===

export async function toggleDeviceAction(
  deviceId: string,
  code: string,
  value: boolean
): Promise<ActionResult<boolean>> {
  try {
    const result = await sendCommand(deviceId, [{ code, value }]);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to toggle device",
    };
  }
}

export async function renameDeviceAction(
  deviceId: string,
  name: string
): Promise<ActionResult<boolean>> {
  try {
    const result = await renameDevice(deviceId, name);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to rename device",
    };
  }
}

export async function controlShutterAction(
  deviceId: string,
  action: "open" | "close" | "stop"
): Promise<ActionResult<boolean>> {
  try {
    const result = await sendCommand(deviceId, [
      { code: "control", value: action },
    ]);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to control shutter",
    };
  }
}

// === Scene Actions ===

export async function triggerSceneAction(
  sceneId: string
): Promise<ActionResult<boolean>> {
  try {
    const result = await triggerScene(sceneId);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to trigger scene",
    };
  }
}

export async function createSceneAction(
  name: string,
  actions: {
    entity_id: string;
    action_executor: string;
    executor_property: Record<string, unknown>;
  }[]
): Promise<ActionResult> {
  try {
    const result = await createScene({ name, actions });
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create scene",
    };
  }
}

export async function deleteSceneAction(
  sceneId: string
): Promise<ActionResult<boolean>> {
  try {
    const result = await deleteScene(sceneId);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete scene",
    };
  }
}

// === Automation Actions ===

export async function createAutomationAction(
  body: CreateAutomationBody
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = await createAutomation(body);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create automation",
    };
  }
}

export async function toggleAutomationAction(
  automationId: string,
  enabled: boolean
): Promise<ActionResult<boolean>> {
  try {
    const result = await toggleAutomation(automationId, enabled);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to toggle automation",
    };
  }
}

export async function deleteAutomationAction(
  automationId: string
): Promise<ActionResult<boolean>> {
  try {
    const result = await deleteAutomation(automationId);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete automation",
    };
  }
}

// === Timer Actions ===

export async function createTimerAction(
  deviceId: string,
  body: CreateTimerBody
): Promise<ActionResult> {
  try {
    const result = await createTimer(deviceId, body);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create timer",
    };
  }
}

export async function deleteTimerAction(
  deviceId: string,
  timerId: string
): Promise<ActionResult<boolean>> {
  try {
    const result = await deleteTimer(deviceId, timerId);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete timer",
    };
  }
}

// === Mirror Group Actions ===

async function readMirrorGroups(): Promise<MirrorGroupsData> {
  await ensureMirrorsFile();
  const raw = await fs.readFile(MIRRORS_PATH, "utf-8");
  return JSON.parse(raw) as MirrorGroupsData;
}

async function writeMirrorGroups(data: MirrorGroupsData): Promise<void> {
  await fs.writeFile(MIRRORS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function createMirrorGroupAction(
  name: string,
  main: MirrorButton,
  mirrors: MirrorButton[]
): Promise<ActionResult<MirrorGroup>> {
  try {
    const automationIds: string[] = [];

    for (const mirror of mirrors) {
      const a1 = await createAutomation({
        name: `Mirror: ${main.label} \u2194 ${mirror.label} (ON\u2192ON)`,
        conditions: [
          {
            entity_id: main.device_id,
            entity_type: 1,
            order_num: 1,
            display: { code: main.button_code, operator: "==", value: true },
          },
        ],
        actions: [
          {
            entity_id: mirror.device_id,
            action_executor: "dpIssue",
            executor_property: { [mirror.button_code]: true },
          },
        ],
        match_type: 1,
      });
      automationIds.push(a1.id);

      const a2 = await createAutomation({
        name: `Mirror: ${main.label} \u2194 ${mirror.label} (OFF\u2192OFF)`,
        conditions: [
          {
            entity_id: main.device_id,
            entity_type: 1,
            order_num: 1,
            display: { code: main.button_code, operator: "==", value: false },
          },
        ],
        actions: [
          {
            entity_id: mirror.device_id,
            action_executor: "dpIssue",
            executor_property: { [mirror.button_code]: false },
          },
        ],
        match_type: 1,
      });
      automationIds.push(a2.id);

      const a3 = await createAutomation({
        name: `Mirror: ${mirror.label} \u2194 ${main.label} (ON\u2192ON)`,
        conditions: [
          {
            entity_id: mirror.device_id,
            entity_type: 1,
            order_num: 1,
            display: {
              code: mirror.button_code,
              operator: "==",
              value: true,
            },
          },
        ],
        actions: [
          {
            entity_id: main.device_id,
            action_executor: "dpIssue",
            executor_property: { [main.button_code]: true },
          },
        ],
        match_type: 1,
      });
      automationIds.push(a3.id);

      const a4 = await createAutomation({
        name: `Mirror: ${mirror.label} \u2194 ${main.label} (OFF\u2192OFF)`,
        conditions: [
          {
            entity_id: mirror.device_id,
            entity_type: 1,
            order_num: 1,
            display: {
              code: mirror.button_code,
              operator: "==",
              value: false,
            },
          },
        ],
        actions: [
          {
            entity_id: main.device_id,
            action_executor: "dpIssue",
            executor_property: { [main.button_code]: false },
          },
        ],
        match_type: 1,
      });
      automationIds.push(a4.id);
    }

    const group: MirrorGroup = {
      id: crypto.randomUUID(),
      name,
      main,
      mirrors,
      automation_ids: automationIds,
    };

    const data = await readMirrorGroups();
    data.groups.push(group);
    await writeMirrorGroups(data);

    return { success: true, data: group };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create mirror group",
    };
  }
}

export async function deleteMirrorGroupAction(
  groupId: string
): Promise<ActionResult<boolean>> {
  try {
    const data = await readMirrorGroups();
    const group = data.groups.find((g) => g.id === groupId);

    if (!group) {
      return { success: false, error: "Mirror group not found" };
    }

    await Promise.all(
      group.automation_ids.map((id) => deleteAutomation(id))
    );

    data.groups = data.groups.filter((g) => g.id !== groupId);
    await writeMirrorGroups(data);

    return { success: true, data: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete mirror group",
    };
  }
}

export async function getMirrorGroupsAction(): Promise<
  ActionResult<MirrorGroupsData>
> {
  try {
    const data = await readMirrorGroups();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to read mirror groups",
    };
  }
}
