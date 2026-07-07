import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { buildExportScopeEntityOptions } from "@/lib/argus/export/scope-entities";
import type { ExportScopeType } from "@/lib/argus/export/types";
import { readArgus } from "@/lib/argus/server-storage";
import { V2DeliverShell } from "./components/V2DeliverShell";

const SCOPE_TYPES = new Set<ExportScopeType>([
  "person",
  "project",
  "organization",
  "topic",
  "event",
]);

export default async function V2DeliverPage({
  searchParams,
}: {
  searchParams: Promise<{ scopeType?: string; scopeId?: string }>;
}) {
  const params = await searchParams;
  const data = await readArgus();
  const entityOptions = buildExportScopeEntityOptions(data);
  const includePrivate = await hasArgusPrivateUnlock();

  const scopeType = SCOPE_TYPES.has(params.scopeType as ExportScopeType)
    ? (params.scopeType as ExportScopeType)
    : undefined;

  return (
    <V2DeliverShell
      entityOptions={entityOptions}
      privateConfigured={argusPrivateConfigured()}
      privateUnlocked={includePrivate}
      initialScopeType={scopeType}
      initialScopeId={params.scopeId}
    />
  );
}
