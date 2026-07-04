import type { Playbook } from "../playbook-types";

export interface PlaybooksStore {
  readAll(): Promise<Playbook[]>;
  upsert(playbook: Playbook): Promise<void>;
}
