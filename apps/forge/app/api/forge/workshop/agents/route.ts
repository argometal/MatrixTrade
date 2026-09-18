import { NextResponse } from "next/server";
import type { TbcConfig } from "@/lib/workshop/tbc-types";
import type { MouseProfile } from "@/lib/workshop/mouse-types";
import {
  startWorkshopAgent,
  stopWorkshopAgent,
  workshopAgentLauncherStatus,
  writeMouseProfilesOnDisk,
  writeTbcConfigOnDisk,
} from "@/lib/workshop/agent-launcher.server";

export const runtime = "nodejs";

type Body = {
  action?: "start" | "stop" | "status" | "write-config";
  agent?: "tbc" | "mouse";
  config?: TbcConfig;
  mouseProfiles?: MouseProfile[];
};

export async function GET() {
  const status = await workshopAgentLauncherStatus();
  return NextResponse.json({ ok: true, ...status });
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action ?? "start";
  const agent = body.agent ?? "tbc";

  if (action === "status") {
    const status = await workshopAgentLauncherStatus();
    return NextResponse.json({ ok: true, ...status });
  }

  if (action === "write-config") {
    if (agent === "tbc" && body.config) {
      const path = writeTbcConfigOnDisk(body.config);
      return NextResponse.json({ ok: true, message: "Wrote tbc.config.json", path });
    }
    if (agent === "mouse" && body.mouseProfiles) {
      const path = writeMouseProfilesOnDisk(body.mouseProfiles);
      return NextResponse.json({ ok: true, message: "Wrote mouse-profiles.json", path });
    }
    return NextResponse.json({ ok: false, error: "Missing config payload" }, { status: 400 });
  }

  if (action === "stop") {
    const result = await stopWorkshopAgent(agent);
    return NextResponse.json({ ok: result.ok, message: result.message });
  }

  if (action === "start") {
    const result = await startWorkshopAgent(agent, {
      tbcConfig: body.config,
      mouseProfiles: body.mouseProfiles,
    });
    return NextResponse.json({ ok: result.ok, message: result.message });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
