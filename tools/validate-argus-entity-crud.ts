/**
 * Verify standalone entity CRUD for all canonical reference kinds.
 * Run: npx tsx tools/validate-argus-entity-crud.ts
 */
import {
  createEntity,
  deleteEntity,
  getEntity,
  readArgus,
} from "../lib/argus/server-storage";
import {
  REFERENCE_KINDS,
  referenceKindToCreateInput,
  referenceKindFromNotes,
  type ReferenceKind,
} from "../lib/argus/reference-types";

async function main() {
  const stamp = Date.now();
  const createdIds: string[] = [];

  for (const kind of REFERENCE_KINDS) {
    const name = `CRUD-${kind}-${stamp}`;
    const notes = `Standalone create test for ${kind}`;
    const { entityType, notes: builtNotes } = referenceKindToCreateInput(kind, name, notes);

    const entity = await createEntity({
      type: entityType,
      name,
      notes: builtNotes,
      alias: "",
      strategicValue: 3,
    });
    createdIds.push(entity.id);

    const loaded = await getEntity(entity.id);
    if (!loaded || loaded.name !== name) {
      throw new Error(`Create/read failed for ${kind}`);
    }

    if (kind === "topic" || kind === "event") {
      const parsed = referenceKindFromNotes(loaded.notes);
      if (parsed !== kind) {
        throw new Error(`Kind prefix missing for ${kind}: got ${parsed}`);
      }
    }

    console.log(`OK create+read: ${kind} → ${entity.id}`);
  }

  const data = await readArgus();
  for (const id of createdIds) {
    const found = data.entities.find((e) => e.id === id);
    if (!found) {
      throw new Error(`Entity ${id} missing after readArgus reload`);
    }
  }
  console.log("OK persist: all entities present after readArgus");

  for (const id of createdIds) {
    await deleteEntity(id);
  }
  console.log("OK cleanup: test entities deleted");
  console.log("Standalone entity CRUD verification passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
