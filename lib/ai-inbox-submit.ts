/**
 * @deprecated Use submitToTradingInbox from lib/trading-inbox-submit.ts
 */
import { submitToTradingInbox } from "./trading-inbox-submit";

export async function submitInboxProposal(payload: Record<string, unknown>) {
  return submitToTradingInbox(payload);
}
