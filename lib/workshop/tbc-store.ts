import type { TbcConfig } from "./tbc-types";
import { WORKSHOP_TOOLBOX_STORAGE_KEY } from "./tbc-types";

export function defaultTbcConfig(): TbcConfig {
  return {
    version: 2,
    name: "Forge Workshop Toolbox",
    port: 4010,
    description: "Exported from ArgusForge Workshop. Use Local agents tab to run app/folder tiles.",
    macros: {
      STARTUP_TOOLS: "C:\\Startup_tools\\",
      TBC_ROOT: "C:\\Tools\\TBCompanion",
    },
    pages: [
      {
        id: "quick",
        title: "Quick links",
        subtitle: "URLs work in the browser; apps need the TBC agent",
        tiles: [
          {
            id: "argus",
            label: "ARGUS",
            icon: "🛡",
            kind: "url",
            target: "https://matrix-trade-theta.vercel.app/argus/v2",
            accent: "#84cc16",
          },
        ],
      },
    ],
  };
}

export function loadToolboxConfig(): TbcConfig {
  if (typeof window === "undefined") return defaultTbcConfig();
  try {
    const raw = localStorage.getItem(WORKSHOP_TOOLBOX_STORAGE_KEY);
    if (!raw) return defaultTbcConfig();
    const parsed = JSON.parse(raw) as TbcConfig;
    if (!parsed?.pages?.length) return defaultTbcConfig();
    return parsed;
  } catch {
    return defaultTbcConfig();
  }
}

export function saveToolboxConfig(cfg: TbcConfig): void {
  localStorage.setItem(WORKSHOP_TOOLBOX_STORAGE_KEY, JSON.stringify(cfg, null, 2));
}

export function parseTbcConfigJson(json: string): TbcConfig {
  const data = JSON.parse(json) as TbcConfig;
  if (!data || typeof data !== "object" || !Array.isArray(data.pages)) {
    throw new Error("Invalid toolbox config: missing pages[]");
  }
  return {
    version: data.version ?? 2,
    name: data.name ?? "Imported toolbox",
    port: data.port ?? 4010,
    description: data.description ?? "",
    macros: data.macros ?? {},
    pages: data.pages,
    launcherGrid: data.launcherGrid,
  };
}
