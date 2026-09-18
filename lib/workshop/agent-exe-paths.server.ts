import fs from "node:fs";
import path from "node:path";

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

/** TBCompanion portable for Workshop (Forge CORS build or legacy). */
export function resolveTbcPortableExe(): string | null {
  const cwd = process.cwd();
  const env = process.env.FORGE_TBC_EXE?.trim();
  if (env && fs.existsSync(env)) return env;

  return firstExisting([
    path.join(cwd, "public", "workshop", "releases", "TBCompanion-1.0.1-win-portable.exe"),
    path.join(cwd, "public", "workshop", "releases", "TBCompanion-1.0.0-win-portable.exe"),
    path.join(cwd, "..", "TBCompanion", "TBCompanion-1.0.0-win-portable.exe"),
    "C:\\Tools\\TBCompanion\\TBCompanion-1.0.0-win-portable.exe",
    path.join(cwd, "workshop-agents", "TBCompanion-electron", "dist", "TBCompanion-1.0.1-win-portable.exe"),
  ]);
}

export function resolveMousePortableExe(): string | null {
  const cwd = process.cwd();
  const env = process.env.FORGE_MOUSE_EXE?.trim();
  if (env && fs.existsSync(env)) return env;

  return firstExisting([
    path.join(cwd, "public", "workshop", "releases", "MouseSimSL-1.0.0-win-portable.exe"),
    path.join(cwd, "..", "dist-build", "MouseSimSL-1.0.0-win-portable.exe"),
    "C:\\Tools\\dist-build\\MouseSimSL-1.0.0-win-portable.exe",
  ]);
}

export function listWorkshopReleaseDownloads(): { name: string; href: string }[] {
  const dir = path.join(process.cwd(), "public", "workshop", "releases");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".exe"))
    .map((name) => ({ name, href: `/workshop/releases/${name}` }));
}
