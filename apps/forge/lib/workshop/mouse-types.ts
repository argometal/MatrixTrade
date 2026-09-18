export type MouseStep =
  | { type: "delay"; ms: number }
  | { type: "move"; x: number; y: number }
  | { type: "click"; button?: "left" | "right" };

export type MouseProfile = {
  id: string;
  name: string;
  notes?: string;
  steps: MouseStep[];
  updatedAt: string;
};

export type MouseProfilesFile = {
  version: 1;
  profiles: MouseProfile[];
};

export const MOUSE_PROFILES_FILENAME = "mouse-profiles.json";
