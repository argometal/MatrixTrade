/**
 * Production workflow validation against shared Supabase backend (same DB as Vercel).
 * Run: npx tsx tools/validate-argus-production-workflows.ts
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

type Check = { id: string; pass: boolean; detail: string };

function record(results: Check[], id: string, pass: boolean, detail: string): void {
  results.push({ id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}: ${detail}`);
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  process.env.ARGUS_JOURNAL_STORE = process.env.ARGUS_JOURNAL_STORE ?? "supabase";
  process.env.ARGUS_INBOX_STORE = process.env.ARGUS_INBOX_STORE ?? "supabase";

  const results: Check[] = [];
  const stamp = Date.now();
  const ids: string[] = [];

  const {
    createEntity,
    createLog,
    createInboxItem,
    linkInboxToEntities,
    classifyLog,
    getLogsForEntity,
    getInboxItems,
    getEntity,
    updateEntity,
    deleteEntity,
    deleteLog,
    deleteInboxItem,
  } = await import("../lib/argus/server-storage");
  const { referenceKindToCreateInput } = await import("../lib/argus/reference-types");

  try {
    const personInput = referenceKindToCreateInput("person", `WF1-Person-${stamp}`, "");
    const person = await createEntity({
      type: personInput.entityType,
      name: `WF1-Person-${stamp}`,
      notes: personInput.notes,
      alias: "",
      strategicValue: 3,
    });
    ids.push(person.id);

    const evidence = await createLog({
      title: `WF1-Evidence-${stamp}`,
      body: "Evidence attached to person",
      kind: "log",
      date: new Date().toISOString().slice(0, 10),
      entityIds: [person.id],
      classificationStatus: "classified",
      attachmentIds: [],
      private: false,
      source: "manual",
      topics: [],
    });

    const meeting = await createLog({
      title: `WF1-Meeting-${stamp}`,
      body: "Meeting notes",
      kind: "event",
      date: new Date().toISOString().slice(0, 10),
      entityIds: [person.id],
      classificationStatus: "classified",
      attachmentIds: [],
      private: false,
      source: "manual",
      topics: [],
    });

    const inbox = await createInboxItem({
      source: "email",
      rawText: "Email body probe",
      subject: `WF1-Email-${stamp}`,
      fromAddress: "probe@example.com",
      toAddress: "argus@argometal.dev",
      attachmentIds: [],
    });
    await linkInboxToEntities(inbox.id, [person.id]);

    const logs = await getLogsForEntity(person.id, true);
    const linkedInbox = (await getInboxItems()).filter((i) => i.linkedEntityIds?.includes(person.id));

    record(
      results,
      "scenario1-person-history",
      logs.length >= 2 && linkedInbox.some((i) => i.id === inbox.id),
      `Person has ${logs.length} logs and ${linkedInbox.length} linked inbox item(s)`
    );

    await deleteLog(evidence.id);
    await deleteLog(meeting.id);
    await deleteInboxItem(inbox.id);
  } catch (err) {
    record(results, "scenario1-person-history", false, err instanceof Error ? err.message : String(err));
  }

  try {
    const projectInput = referenceKindToCreateInput("project", `WF2-Project-${stamp}`, "");
    const project = await createEntity({
      type: projectInput.entityType,
      name: `WF2-Project-${stamp}`,
      notes: projectInput.notes,
      alias: "",
      strategicValue: 3,
    });
    ids.push(project.id);

    const p1 = await createEntity({
      type: "person",
      name: `WF2-P1-${stamp}`,
      notes: "",
      alias: "",
      strategicValue: 3,
    });
    const p2 = await createEntity({
      type: "person",
      name: `WF2-P2-${stamp}`,
      notes: "",
      alias: "",
      strategicValue: 3,
    });
    ids.push(p1.id, p2.id);

    await updateEntity(project.id, { linkedPersonIds: [p1.id, p2.id] });

    const eventInput = referenceKindToCreateInput("event", `WF2-Event-${stamp}`, "");
    const eventEntity = await createEntity({
      type: eventInput.entityType,
      name: `WF2-Event-${stamp}`,
      notes: eventInput.notes,
      alias: "",
      strategicValue: 3,
    });
    ids.push(eventEntity.id);

    const projectLog = await createLog({
      title: `WF2-ProjectLog-${stamp}`,
      body: "Project evidence",
      kind: "log",
      date: new Date().toISOString().slice(0, 10),
      entityIds: [project.id, eventEntity.id],
      classificationStatus: "classified",
      attachmentIds: [],
      private: false,
      source: "manual",
      topics: [],
    });

    const updated = await getEntity(project.id);
    const projectLogs = await getLogsForEntity(project.id, true);
    record(
      results,
      "scenario2-project-chronology",
      Boolean(updated?.linkedPersonIds?.length === 2 && projectLogs.some((l) => l.id === projectLog.id)),
      `Project links ${updated?.linkedPersonIds?.length ?? 0} people, ${projectLogs.length} log(s)`
    );
    await deleteLog(projectLog.id);
  } catch (err) {
    record(results, "scenario2-project-chronology", false, err instanceof Error ? err.message : String(err));
  }

  try {
    const eventInput = referenceKindToCreateInput("event", `WF3-Event-${stamp}`, "");
    const eventEntity = await createEntity({
      type: eventInput.entityType,
      name: `WF3-Event-${stamp}`,
      notes: eventInput.notes,
      alias: "",
      strategicValue: 3,
    });
    ids.push(eventEntity.id);

    const participant = await createEntity({
      type: "person",
      name: `WF3-Participant-${stamp}`,
      notes: "",
      alias: "",
      strategicValue: 3,
    });
    ids.push(participant.id);

    const log = await createLog({
      title: `WF3-Evidence-${stamp}`,
      body: "Event evidence with participant",
      kind: "log",
      date: new Date().toISOString().slice(0, 10),
      entityIds: [eventEntity.id, participant.id],
      classificationStatus: "classified",
      attachmentIds: [],
      private: false,
      source: "manual",
      topics: [],
    });

    const eventLogs = await getLogsForEntity(eventEntity.id, true);
    record(
      results,
      "scenario3-event-retrieval",
      eventLogs.some((l) => l.id === log.id),
      `Event has ${eventLogs.length} retrievable log(s)`
    );
    await deleteLog(log.id);
  } catch (err) {
    record(results, "scenario3-event-retrieval", false, err instanceof Error ? err.message : String(err));
  }

  try {
    const unclassified = await createLog({
      title: `WF4-Unclassified-${stamp}`,
      body: "Captured first, classified later",
      kind: "log",
      date: new Date().toISOString().slice(0, 10),
      entityIds: [],
      classificationStatus: "needs_classification",
      attachmentIds: [],
      private: false,
      source: "manual",
      topics: [],
    });

    const personInput = referenceKindToCreateInput("person", `WF4-Person-${stamp}`, "");
    const person = await createEntity({
      type: personInput.entityType,
      name: `WF4-Person-${stamp}`,
      notes: personInput.notes,
      alias: "",
      strategicValue: 3,
    });
    ids.push(person.id);

    const projectInput = referenceKindToCreateInput("project", `WF4-Project-${stamp}`, "");
    const project = await createEntity({
      type: projectInput.entityType,
      name: `WF4-Project-${stamp}`,
      notes: projectInput.notes,
      alias: "",
      strategicValue: 3,
    });
    ids.push(project.id);

    const eventInput = referenceKindToCreateInput("event", `WF4-Event-${stamp}`, "");
    const eventEntity = await createEntity({
      type: eventInput.entityType,
      name: `WF4-Event-${stamp}`,
      notes: eventInput.notes,
      alias: "",
      strategicValue: 3,
    });
    ids.push(eventEntity.id);

    const classified = await classifyLog(unclassified.id, [person.id, project.id, eventEntity.id]);
    const dupCount = [person.id, project.id, eventEntity.id].filter((id) =>
      classified.entityIds.includes(id)
    ).length;

    record(
      results,
      "scenario4-late-relate-no-dup",
      classified.entityIds.length === 3 && dupCount === 3,
      `Single log ${classified.id} linked to ${classified.entityIds.length} entities (no duplicate log rows)`
    );
    await deleteLog(unclassified.id);
  } catch (err) {
    record(results, "scenario4-late-relate-no-dup", false, err instanceof Error ? err.message : String(err));
  }

  for (const id of [...new Set(ids)]) {
    await deleteEntity(id).catch(() => {});
  }
  record(results, "cleanup", true, "Workflow probe entities deleted");

  const failed = results.filter((r) => !r.pass);
  console.log(`\nWorkflow checks: ${failed.length === 0 ? "PASS" : `${failed.length} FAIL`}`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
