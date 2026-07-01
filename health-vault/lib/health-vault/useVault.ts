"use client";

import { useCallback, useEffect, useState } from "react";
import * as storage from "./storage";
import type { EvidenceInput, PersonInput, RecordInput } from "./types";

export function useVault() {
  const [version, setVersion] = useState(0);
  const ready = version >= 0;

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    storage.loadData();
    refresh();
  }, [refresh]);

  void version;

  return {
    ready,
    refresh,
    getPeople: storage.getPeople,
    getPerson: storage.getPerson,
    createPerson: (input: PersonInput) => { const p = storage.createPerson(input); refresh(); return p; },
    updatePerson: (id: string, input: Partial<PersonInput>) => { const p = storage.updatePerson(id, input); refresh(); return p; },
    getRecords: storage.getRecords,
    getRecord: storage.getRecord,
    createRecord: (input: RecordInput) => { const r = storage.createRecord(input); refresh(); return r; },
    updateRecord: (id: string, input: Partial<RecordInput>) => { const r = storage.updateRecord(id, input); refresh(); return r; },
    getEvidence: storage.getEvidence,
    createEvidence: (input: EvidenceInput) => { const e = storage.createEvidence(input); refresh(); return e; },
    searchRecords: storage.searchRecords,
    searchPeople: storage.searchPeople,
    getRecordsForPerson: storage.getRecordsForPerson,
    getStats: storage.getStats,
    getRecentRecords: storage.getRecentRecords,
    getRecentEvidence: storage.getRecentEvidence,
  };
}
