"use client";

/**
 * DISABLED — do not mount.
 *
 * This panel deep-linked MatrixTrade trading routes under the label “MTA”.
 * That collided with ArgusForge contract MTA (temporal/matrix engine toward
 * Alexandria). Trading lives at MatrixTrade (`/home-preview`, etc.) via app
 * switcher — not inside the Forge system toggle.
 *
 * Kept as a stub so old imports fail closed if revived by mistake.
 */

export function MtaScopedPanel(_props: {
  section: "home" | "library" | "active" | "archive";
}): null {
  return null;
}
