import type { ObservationRecord } from "../observation-types";

export interface ObservationsStore {
  readAll(): Promise<ObservationRecord[]>;
  upsert(row: ObservationRecord): Promise<void>;
}
