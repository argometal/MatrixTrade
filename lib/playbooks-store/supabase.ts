import { createSupabaseAdmin } from "../supabase/server";
import type { Playbook, PlaybookStatus } from "../playbook-types";
import type { PlaybooksStore } from "./types";

interface PlaybookRow {
  id: string;
  name: string;
  status: PlaybookStatus;
  description: string;
  checklist: string[];
}

function rowToPlaybook(row: PlaybookRow): Playbook {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    description: row.description ?? "",
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
  };
}

export function createSupabasePlaybooksStore(): PlaybooksStore {
  return {
    async readAll() {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase.from("playbooks").select("*").order("id");
      if (error) {
        throw new Error(`Supabase playbooks read failed: ${error.message}`);
      }
      return (data ?? []).map((row) => rowToPlaybook(row as PlaybookRow));
    },
  };
}
