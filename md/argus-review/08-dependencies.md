# 08 — Dependencies

---

## External dependencies (detectably used by Argus)

| Package | Detected import site |
|---------|----------------------|
| `next` | layouts, pages, API routes, `argus-legacy-redirects`, hooks |
| `react` / `react-dom` | components + `create-link-flow-state`, overlay hooks |
| `@supabase/supabase-js` | via `@/lib/supabase/server` in inbox/journal stores, protection, quota, health |
| `archiver` | `lib/argus/export/writers/zip-writer.ts` |
| `pdfkit` | `lib/argus/export/packages/pdf-deliver.ts` |

| Package in `package.json` | ARGUS import under `app/argus`, `lib/argus`, `app/api/argus`? |
|---------------------------|--------------------------------------------------------------|
| `qrcode` | No |
| `@xyflow/react` | No (Forge likely) |
| `d3-force-3d`, `three`, `react-force-graph-3d`, `three-spritetext` | No (Forge/3D) |

Node built-ins used: `fs`, `path`, `crypto`, `stream`.

---

## Internal dependency graph (canonical)

```text
app/argus/** (UI)
    → app/argus/actions.ts
    → lib/argus/v2/* (view models)
    → lib/argus/* (domain)
    → lib/auth/*

app/api/argus/**
    → lib/argus/server-storage.ts
    → lib/argus/export/*
    → lib/auth/*

lib/argus/server-storage.ts
    → lib/argus/storage/*
    → lib/argus/journal-store/*
    → lib/argus/inbox-store/*
    → lib/argus/data-safety/*
    → lib/argus/supabase-protection/*
    → lib/argus/normalize.ts, migrate.ts, link-hierarchy.ts, …

lib/argus/v2/*
    → lib/argus/types.ts, reference-types.ts, network*, hierarchy, tag-patterns, …
    → (loaders typically pure; pages call readArgus)
```

Doc rule: UI must not import storage paths directly (`md/integrations/argus-storage.md`).

---

## Shared modules

| Shared module | Consumers |
|---------------|-----------|
| `lib/argus/types.ts` | Broad |
| `lib/argus/server-storage.ts` | actions, API, some lib helpers |
| `lib/argus/ux-copy.ts` | UI copy |
| `lib/argus/reference-types.ts` | create/link, loaders, hierarchy |
| `lib/auth/*` | Argus + Trading auth surfaces |
| `@/lib/supabase/server` | Cloud stores |

---

## Reverse imports (lib → app)

Observed:

| From | To |
|------|----|
| `lib/argus/create-flow-types.ts` | `@/app/argus/components/ReferencePickerModal` |
| `lib/argus/create-link-flow-state.ts` | `@/app/argus/actions` |
| `lib/argus/link-modal-adapter.ts` | actions + ReferencePickerModal |
| `lib/argus/v2/network-contact-loaders.ts` | ReferencePickerModal |

---

## Potential circular dependencies

| Question | Finding |
|----------|---------|
| Documented circular import risks in `md/` for Argus | None found (no hits for circular / import cycle / dependency cycle in Argus docs) |
| Lib→App reverse imports | Present (table above) |
| True bundler cycle | UNKNOWN without bundler cycle report |

---

## Cross-cutting related packages

| Path | Relation |
|------|----------|
| `argus-email-bridge/` | Separate Node worker (own `package.json`) |
| `tools/validate-argus-*.ts`, `verify-argus-*.ts`, `backup-argus-supabase.ts` | Ops scripts |
| `lib/argusforge/`, `app/forge/` | Separate ArgusForge surface |
| MatrixTrade trading modules | Share auth only (constitution) |
