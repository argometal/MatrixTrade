import { getStockThesisById } from "./stock-theses";
import { rollbackStockCaseCreate } from "./stock-case-rollback";

export function validateStockCaseDeleteProposal(
  proposal: Record<string, unknown>
): { ok: true; id: string } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const id = String(proposal.id ?? "").trim().toUpperCase();
  if (!id) errors.push("proposal.id required (Stock Profile id, e.g. ST-MSFT-002).");
  if (proposal.confirmDelete !== true) {
    errors.push("proposal.confirmDelete must be true. No records are deleted without explicit confirmation.");
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, id };
}

export async function deleteStockCaseFromProposal(
  proposal: Record<string, unknown>
): Promise<{ deletedId?: string; errors?: string[]; warnings?: string[] }> {
  const validation = validateStockCaseDeleteProposal(proposal);
  if (!validation.ok) return { errors: validation.errors };

  const existing = await getStockThesisById(validation.id);
  if (!existing) {
    return { errors: [`Stock profile ${validation.id} not found. Nothing was deleted.`] };
  }

  await rollbackStockCaseCreate(validation.id);

  const stillThere = await getStockThesisById(validation.id);
  if (stillThere) {
    return { errors: [`Delete failed — ${validation.id} still exists.`] };
  }

  const reason = String(proposal.reason ?? "").trim();
  return {
    deletedId: validation.id,
    warnings: reason ? [`Reason: ${reason}`] : undefined,
  };
}
