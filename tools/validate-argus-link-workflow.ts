/**
 * Validate inbox → link → retrieve workflow.
 * Run: npx tsx tools/validate-argus-link-workflow.ts
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  process.env.ARGUS_JOURNAL_STORE = process.env.ARGUS_JOURNAL_STORE ?? "supabase";
  process.env.ARGUS_INBOX_STORE = process.env.ARGUS_INBOX_STORE ?? "supabase";

  const stamp = Date.now();
  const {
    createEntity,
    createInboxItem,
    linkInboxToEntities,
    convertInboxToLog,
    deleteEntity,
    deleteInboxItem,
    deleteLog,
    getInboxItems,
    readArgus,
  } = await import("../lib/argus/server-storage");
  const { referenceKindToCreateInput } = await import("../lib/argus/reference-types");
  const { getEntityEvidence } = await import("../lib/argus/entity-evidence");

  const personInput = referenceKindToCreateInput("person", `LINK-Person-${stamp}`, "");
  const person = await createEntity({
    type: personInput.entityType,
    name: `LINK-Person-${stamp}`,
    notes: personInput.notes,
    alias: "",
    strategicValue: 3,
  });

  const projectInput = referenceKindToCreateInput("project", `LINK-Project-${stamp}`, "");
  const project = await createEntity({
    type: projectInput.entityType,
    name: `LINK-Project-${stamp}`,
    notes: projectInput.notes,
    alias: "",
    strategicValue: 3,
  });

  const inbox = await createInboxItem({
    source: "email",
    rawText: `Handover note ${stamp}`,
    subject: `LINK-Inbox-${stamp}`,
    fromAddress: "handover@example.com",
    attachmentIds: [],
  });

  await linkInboxToEntities(inbox.id, [person.id, project.id]);

  let data = await readArgus();
  const inboxItems = await getInboxItems();
  let personEvidence = getEntityEvidence(data, inboxItems, person.id, true);
  let projectEvidence = getEntityEvidence(data, inboxItems, project.id, true);

  if (personEvidence.linkedInbox.length !== 1 || projectEvidence.linkedInbox.length !== 1) {
    throw new Error("Linked inbox not retrievable from both entities after link");
  }
  console.log("PASS  link-inbox-multi: Inbox linked to person + project, retrievable from both");

  const { log } = await convertInboxToLog(inbox.id, {
    kind: "log",
    title: `LINK-Log-${stamp}`,
    body: `Converted evidence ${stamp}`,
    date: new Date().toISOString().slice(0, 10),
    entityIds: [person.id, project.id],
    private: false,
  });

  data = await readArgus();
  const inboxAfter = await getInboxItems();
  personEvidence = getEntityEvidence(data, inboxAfter, person.id, true);
  projectEvidence = getEntityEvidence(data, inboxAfter, project.id, true);

  const personHasLog = personEvidence.logs.some((l) => l.id === log.id);
  const projectHasLog = projectEvidence.logs.some((l) => l.id === log.id);
  if (!personHasLog || !projectHasLog) {
    throw new Error("Converted log not retrievable from both linked entities");
  }
  console.log("PASS  convert-retrieve: Single log retrievable from person and project detail");

  await deleteLog(log.id);
  await deleteInboxItem(inbox.id).catch(() => {});
  await deleteEntity(person.id);
  await deleteEntity(project.id);
  console.log("PASS  cleanup");
  console.log("\nLink workflow validation passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
