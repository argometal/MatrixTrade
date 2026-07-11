import { argusDeleteCodeConfigured } from "@/lib/auth/passwords";
import { argusTotpConfigured } from "@/lib/auth/totp";
import { referenceKindFromNotes } from "@/lib/argus/reference-types";
import type { Entity } from "@/lib/argus/types";

/** Topic, event, and organization links preserve institutional memory — stricter delete auth. */
const AUTH_REQUIRED_KINDS = new Set(["topic", "event", "organization"]);

export function linkedEntityIdsRequireAuthenticator(
  entities: Entity[],
  linkedEntityIds: string[] | undefined
): boolean {
  for (const id of linkedEntityIds ?? []) {
    const entity = entities.find((e) => e.id === id && !e.deletedAt);
    if (!entity) continue;
    const kind = referenceKindFromNotes(entity.notes ?? "");
    if (kind && AUTH_REQUIRED_KINDS.has(kind)) return true;
    if (entity.type === "company") return true;
  }
  return false;
}

export function deleteAuthConfigured(): boolean {
  return argusDeleteCodeConfigured() || argusTotpConfigured();
}

/** Topic, event, and organization deletes preserve institutional memory — TOTP required. */
export function entityDeleteRequiresAuthenticator(entity: Entity): boolean {
  if (entity.type === "company") return true;
  const kind = referenceKindFromNotes(entity.notes ?? "");
  return kind === "topic" || kind === "event" || kind === "organization";
}
