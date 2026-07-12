import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const playbooks = JSON.parse(readFileSync(join(root, "data/playbooks.json"), "utf-8")) as Array<{
  id: string;
  name: string;
  status: string;
  description: string;
  checklist?: string[];
}>;

function sqlString(value: string): string {
  return value.replace(/'/g, "''");
}

const lines = [
  "-- MatrixTrade playbooks seed — run in Supabase SQL Editor only.",
  "-- Do NOT paste tools/seed-supabase.ts here (that is TypeScript, not SQL).",
  "-- Idempotent: safe to re-run.",
  "",
];

for (const pb of playbooks) {
  const checklist = JSON.stringify(pb.checklist ?? []);
  lines.push(
    "insert into public.playbooks (id, name, status, description, checklist)",
    "values (",
    `  '${sqlString(pb.id)}',`,
    `  '${sqlString(pb.name)}',`,
    `  '${sqlString(pb.status)}',`,
    `  '${sqlString(pb.description)}',`,
    `  '${checklist.replace(/'/g, "''")}'::jsonb`,
    ")",
    "on conflict (id) do update set",
    "  name = excluded.name,",
    "  status = excluded.status,",
    "  description = excluded.description,",
    "  checklist = excluded.checklist;",
    ""
  );
}

writeFileSync(join(root, "supabase/seed-playbooks.sql"), lines.join("\n"));
console.log(`Wrote ${playbooks.length} playbook(s) to supabase/seed-playbooks.sql`);
