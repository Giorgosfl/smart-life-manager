import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { homedir } from "node:os";

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
  getDevices,
} from "./tuya";

import type {
  CreateAutomationBody,
  CreateTimerBody,
  KillSwitchConfig,
  MirrorButton,
  MirrorGroup,
  MirrorGroupsData,
  TuyaSceneAction,
} from "../../lib/types";

export type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: string };

const APP_DIR = path.join(homedir(), ".smart-life-manager");
const MIRRORS_PATH = path.join(APP_DIR, "mirrors.json");
const KILLSWITCH_PATH = path.join(APP_DIR, "killswitch.json");

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

function mirrorPairLabel(a: MirrorButton, b: MirrorButton): string {
  if (a.room && b.room && a.room === b.room) {
    const bShort = b.label.replace(`${b.room} `, "");
    return `${a.label} ↔ ${bShort}`;
  }
  return `${a.label} ↔ ${b.label}`;
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
        name: `Mirror: ${mirrorPairLabel(main, mirror)} (ON→ON)`,
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
        name: `Mirror: ${mirrorPairLabel(main, mirror)} (OFF→OFF)`,
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
        name: `Mirror: ${mirrorPairLabel(mirror, main)} (ON→ON)`,
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
        name: `Mirror: ${mirrorPairLabel(mirror, main)} (OFF→OFF)`,
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

// === Kill Switch ===

async function readKillSwitch(): Promise<KillSwitchConfig | null> {
  try {
    await fs.access(KILLSWITCH_PATH);
    const raw = await fs.readFile(KILLSWITCH_PATH, "utf-8");
    return JSON.parse(raw) as KillSwitchConfig;
  } catch {
    return null;
  }
}

async function writeKillSwitch(config: KillSwitchConfig | null): Promise<void> {
  if (config === null) {
    try {
      await fs.unlink(KILLSWITCH_PATH);
    } catch {
      // file didn't exist
    }
    return;
  }
  await fs.mkdir(path.dirname(KILLSWITCH_PATH), { recursive: true });
  await fs.writeFile(KILLSWITCH_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function getKillSwitchAction(): Promise<
  ActionResult<KillSwitchConfig | null>
> {
  try {
    const config = await readKillSwitch();
    return { success: true, data: config };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to read kill switch config",
    };
  }
}

export async function createKillSwitchAction(
  trigger: { device_id: string; button_code: string; label: string },
  delaySeconds: number,
  excludedDeviceIds: string[]
): Promise<ActionResult<KillSwitchConfig>> {
  try {
    // Delete existing kill switch first
    const existing = await readKillSwitch();
    if (existing) {
      try {
        await deleteAutomation(existing.automation_id);
      } catch {
        // automation may have been deleted externally
      }
    }

    const devices = await getDevices();
    const excludedSet = new Set(excludedDeviceIds);
    // Also exclude the trigger device itself
    excludedSet.add(trigger.device_id);

    const actions: TuyaSceneAction[] = [];

    for (const device of devices) {
      if (excludedSet.has(device.id)) continue;
      if (!device.status) continue;

      const isShutter = device.category === "cl" || device.category === "clkg";

      if (isShutter) {
        actions.push({
          entity_id: device.id,
          action_executor: "dpIssue",
          executor_property: { control: "close" },
        });
      } else {
        for (const s of device.status) {
          if (s.code.startsWith("switch_") || s.code === "switch") {
            actions.push({
              entity_id: device.id,
              action_executor: "dpIssue",
              executor_property: { [s.code]: false },
            });
          }
        }
      }
    }

    if (actions.length === 0) {
      return { success: false, error: "No devices to control" };
    }

    // Insert delay action at the beginning if configured
    if (delaySeconds > 0) {
      const delayMinutes = Math.floor(delaySeconds / 60);
      const delaySecs = delaySeconds % 60;
      actions.unshift({
        entity_id: "delay",
        action_executor: "delay",
        executor_property: { minutes: delayMinutes, seconds: delaySecs },
      });
    }

    const result = await createAutomation({
      name: `Kill Switch: ${trigger.label}`,
      conditions: [
        {
          entity_id: trigger.device_id,
          entity_type: 1,
          order_num: 1,
          display: {
            code: trigger.button_code,
            operator: "==",
            value: true,
          },
        },
      ],
      actions,
      match_type: 1,
    });

    const config: KillSwitchConfig = {
      id: crypto.randomUUID(),
      trigger,
      delay_seconds: delaySeconds,
      excluded_device_ids: excludedDeviceIds,
      automation_id: result.id,
    };

    await writeKillSwitch(config);
    return { success: true, data: config };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create kill switch",
    };
  }
}

export async function deleteKillSwitchAction(): Promise<ActionResult<boolean>> {
  try {
    const config = await readKillSwitch();
    if (!config) {
      return { success: false, error: "No kill switch configured" };
    }

    try {
      await deleteAutomation(config.automation_id);
    } catch {
      // automation may have been deleted externally
    }

    await writeKillSwitch(null);
    return { success: true, data: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete kill switch",
    };
  }
}
