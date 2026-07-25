# Legacy Alexandria Adapter — boundary (CHANGE 24-1C)

**Status:** Interface + docs only — **not implemented**  
**Capability status:** `pending_audit`  
**Does not:** write into Alexandria storage · import AF domain into Alexandria repo · fake successful compatibility

---

## Role

Thin, isolated adapter that will later:

1. Accept AF **neutral exchange package** (`argusforge.exchange`).  
2. Translate into formats historical Alexandria can execute.  
3. Run / hand off to Legacy runtime (out of AF process).  
4. Accept a **neutral result package** back for Argus evidence.

AF core must **never** import historical Alexandria domain classes or copy its DB schema.

---

## Interface (TypeScript — stub)

```ts
LegacyAlexandriaAdapter {
  status: "pending_audit"
  canTranslate(exchangePackage) → false until audit mapping exists
  translateForLegacy(exchangePackage) → NotImplemented
  validateLegacyResult(resultPackage) → NotImplemented
  importLegacyResult(resultPackage) → NotImplemented
}
```

Implementation lives at `lib/argusforge/legacy-alexandria-adapter.ts` and throws / returns clear pending results.

---

## When to implement

Only after [`alexandria-legacy-audit-checklist.md`](alexandria-legacy-audit-checklist.md) is completed against `argometal/Alexandria` (formats, keys, ORM, bridge files, assets, sessions).

Do **not** invent mapping before that audit.
