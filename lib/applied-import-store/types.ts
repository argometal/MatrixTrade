export type AppliedImportResult = {
  message: string;
  type: string;
  tradeId?: string;
  playbookId?: string;
  stockFileId?: string;
  planId?: string;
};

export type AppliedImportRecord = {
  fingerprint: string;
  appliedAt: string;
  result: AppliedImportResult;
};

export type AppliedImportStore = {
  findByFingerprint(fingerprint: string): Promise<AppliedImportRecord | null>;
  record(fingerprint: string, result: AppliedImportResult): Promise<AppliedImportRecord>;
};
