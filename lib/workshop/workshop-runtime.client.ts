export type WorkshopRuntimeInfo = {
  canLaunchFromServer: boolean;
  downloads: { name: string; href: string }[];
};

const FALLBACK_DOWNLOADS: { name: string; href: string }[] = [
  { name: "TBCompanion-1.0.0-win-portable.exe", href: "/workshop/releases/TBCompanion-1.0.0-win-portable.exe" },
  { name: "MouseSimSL-1.0.0-win-portable.exe", href: "/workshop/releases/MouseSimSL-1.0.0-win-portable.exe" },
];

export async function fetchWorkshopRuntime(): Promise<WorkshopRuntimeInfo> {
  try {
    const res = await fetch("/api/forge/workshop/agents", { cache: "no-store" });
    const data = (await res.json()) as {
      canLaunchFromServer?: boolean;
      downloads?: { name: string; href: string }[];
    };
    const downloads = (data.downloads?.length ? data.downloads : FALLBACK_DOWNLOADS).slice();
    const envTbc = process.env.NEXT_PUBLIC_WORKSHOP_TBC_EXE_URL;
    const envMouse = process.env.NEXT_PUBLIC_WORKSHOP_MOUSE_EXE_URL;
    if (envTbc) downloads.unshift({ name: "TBCompanion (CDN)", href: envTbc });
    if (envMouse) downloads.push({ name: "MouseSimSL (CDN)", href: envMouse });
    return {
      canLaunchFromServer: !!data.canLaunchFromServer,
      downloads,
    };
  } catch {
    return { canLaunchFromServer: false, downloads: FALLBACK_DOWNLOADS };
  }
}

export function pickTbcDownload(downloads: { name: string; href: string }[]): string | null {
  const tbc = downloads.find((d) => /tbcompanion/i.test(d.name));
  return tbc?.href ?? downloads[0]?.href ?? null;
}
