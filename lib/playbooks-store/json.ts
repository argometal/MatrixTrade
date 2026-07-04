import { promises as fs } from "fs";
import path from "path";
import type { Playbook } from "../playbook-types";
import type { PlaybooksStore } from "./types";

const PLAYBOOKS_FILE = path.join(process.cwd(), "data", "playbooks.json");

export async function readPlaybooksJsonFile(): Promise<Playbook[]> {
  try {
    const raw = await fs.readFile(PLAYBOOKS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Playbook[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

export function createJsonPlaybooksStore(): PlaybooksStore {
  return {
    readAll: readPlaybooksJsonFile,
    async upsert(playbook) {
      const all = await readPlaybooksJsonFile();
      const index = all.findIndex((row) => row.id === playbook.id);
      if (index >= 0) {
        all[index] = playbook;
      } else {
        all.push(playbook);
      }
      all.sort((a, b) => a.id.localeCompare(b.id));
      await fs.mkdir(path.dirname(PLAYBOOKS_FILE), { recursive: true });
      await fs.writeFile(PLAYBOOKS_FILE, `${JSON.stringify(all, null, 2)}\n`, "utf-8");
    },
  };
}
