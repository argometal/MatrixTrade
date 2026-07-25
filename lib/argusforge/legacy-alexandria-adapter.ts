/**
 * CHANGE 24-1C — Legacy Alexandria Adapter boundary.
 * status: pending_audit — does not fake compatibility.
 */

import type { AfExchangePackage, AfResultPackage } from "./af03-builder-types";

export type LegacyAdapterStatus = "pending_audit";

export type LegacyNotImplemented = {
  ok: false;
  status: LegacyAdapterStatus;
  code: "NotImplemented";
  message: string;
};

const PENDING: LegacyNotImplemented = {
  ok: false,
  status: "pending_audit",
  code: "NotImplemented",
  message:
    "Legacy Alexandria Adapter pending format audit — see md/argusforge/alexandria-legacy-audit-checklist.md",
};

export const legacyAlexandriaAdapter = {
  status: "pending_audit" as LegacyAdapterStatus,

  canTranslate(_exchangePackage: AfExchangePackage): boolean {
    return false;
  },

  translateForLegacy(_exchangePackage: AfExchangePackage): LegacyNotImplemented {
    return { ...PENDING };
  },

  validateLegacyResult(_resultPackage: AfResultPackage): LegacyNotImplemented {
    return { ...PENDING };
  },

  importLegacyResult(_resultPackage: AfResultPackage): LegacyNotImplemented {
    return { ...PENDING };
  },
};
