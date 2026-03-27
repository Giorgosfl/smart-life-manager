import { NextResponse } from "next/server";
import {
  getDevices,
  getDeviceFunctions,
  getTimers,
  getScenes,
  getAutomations,
} from "@/lib/tuya";

export async function GET(
  _request: Request,
  segmentData: { params: Promise<{ path: string[] }> }
) {
  const { path } = await segmentData.params;
  const fullPath = path.join("/");

  try {
    // Match: devices
    if (fullPath === "devices") {
      const data = await getDevices();
      return NextResponse.json(data);
    }

    // Match: devices/{id}/functions
    if (path.length === 3 && path[0] === "devices" && path[2] === "functions") {
      const deviceId = path[1];
      const data = await getDeviceFunctions(deviceId);
      return NextResponse.json(data);
    }

    // Match: devices/{id}/timers
    if (path.length === 3 && path[0] === "devices" && path[2] === "timers") {
      const deviceId = path[1];
      const data = await getTimers(deviceId);
      return NextResponse.json(data);
    }

    // Match: scenes
    if (fullPath === "scenes") {
      const data = await getScenes();
      return NextResponse.json(data);
    }

    // Match: automations
    if (fullPath === "automations") {
      const data = await getAutomations();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
