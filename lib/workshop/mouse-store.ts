import type { MouseProfile, MouseProfilesFile } from "./mouse-types";
import { WORKSHOP_MOUSE_STORAGE_KEY } from "./tbc-types";

export function loadMouseProfiles(): MouseProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WORKSHOP_MOUSE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MouseProfilesFile | MouseProfile[];
    if (Array.isArray(parsed)) return parsed as MouseProfile[];
    if (parsed && Array.isArray(parsed.profiles)) return parsed.profiles;
    return [];
  } catch {
    return [];
  }
}

export function saveMouseProfiles(profiles: MouseProfile[]): void {
  const file: MouseProfilesFile = { version: 1, profiles };
  localStorage.setItem(WORKSHOP_MOUSE_STORAGE_KEY, JSON.stringify(file, null, 2));
}

export function exportMouseProfilesFile(profiles: MouseProfile[]): MouseProfilesFile {
  return { version: 1, profiles };
}

export function parseMouseProfilesJson(json: string): MouseProfile[] {
  const data = JSON.parse(json) as MouseProfilesFile | MouseProfile[];
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.profiles)) return data.profiles;
  throw new Error("Invalid mouse-profiles.json");
}

export function newMouseProfile(name: string): MouseProfile {
  return {
    id: `mp_${Date.now()}`,
    name,
    notes: "",
    steps: [{ type: "delay", ms: 500 }],
    updatedAt: new Date().toISOString(),
  };
}
