/**
 * ARGUS v2 typography floor — dark UI readability baseline.
 * Body 16px (text-base), secondary 14px (text-sm), section titles 16px+.
 * Avoid text-xs / sub-12px for content users must read.
 */
export const V2_TYPE = {
  body: "text-base text-zinc-300",
  bodyMuted: "text-sm text-zinc-400",
  label: "text-sm font-medium text-zinc-400",
  sectionTitle: "text-base font-semibold text-zinc-100",
  caption: "text-sm text-zinc-400",
  nav: "text-base",
} as const;
