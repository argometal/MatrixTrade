/** @internal — use lib/trades-json.ts as the public trades storage API. */
export {
  getTradesStoreMode,
  isSupabaseTradesStore,
  readTradesJson as readTradesFromStore,
  upsertTradeInJson as upsertTradeInStore,
} from "../trades-json";
