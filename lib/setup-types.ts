export interface Setup {
  id: string;
  name: string;
}

export function getSetupName(setups: Setup[], setupId?: string): string | null {
  if (!setupId) return null;
  return setups.find((s) => s.id === setupId)?.name ?? setupId;
}
