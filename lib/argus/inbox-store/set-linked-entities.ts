import type { InboxItem } from "../types";

/** Status after replacing inbox entity links. */
export function inboxStatusAfterLinkReplace(
  item: Pick<InboxItem, "status">,
  linkedCount: number
): InboxItem["status"] {
  if (item.status === "converted") return "converted";
  if (item.status === "archived") return "archived";
  if (linkedCount === 0) return "pending";
  return "linked";
}
