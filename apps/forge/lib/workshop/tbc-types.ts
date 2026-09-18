/** Subset of TBCompanion tbc.config.json — kept compatible for export/import. */

export type TbcTileKind = "open" | "url" | "multi" | "folder";

export type TbcTile = {
  id: string;
  label: string;
  icon?: string;
  kind?: TbcTileKind | string;
  target?: string;
  targets?: string[];
  accent?: string;
};

export type TbcPage = {
  id: string;
  title: string;
  subtitle?: string;
  tiles: TbcTile[];
};

export type TbcConfig = {
  version: number;
  name: string;
  port?: number;
  description?: string;
  macros?: Record<string, string>;
  pages: TbcPage[];
  launcherGrid?: unknown;
};

export const WORKSHOP_TOOLBOX_STORAGE_KEY = "argusforge-workshop-toolbox-v1";
export const WORKSHOP_MOUSE_STORAGE_KEY = "argusforge-workshop-mouse-v1";
