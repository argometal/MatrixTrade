import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ARGUS_AUTH, hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { collectVaultEvidence } from "@/lib/argus/export/collect-evidence";
import { generateShareToken, saveDeliverShare } from "@/lib/argus/export/deliver-shares";
import { resolveDeliverBranding } from "@/lib/argus/export/deliver-branding";
import { buildEvidenceDossierHtml } from "@/lib/argus/export/packages/evidence-dossier-html";
import type { ExportCollectionOptions, ExportScopeType } from "@/lib/argus/export/types";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";

const SCOPE_TYPES = new Set<ExportScopeType>([
  "person",
  "project",
  "organization",
  "topic",
  "event",
]);

function parseOptions(body: Record<string, unknown>): ExportCollectionOptions {
  return {
    fromDate: String(body.fromDate ?? "").trim() || undefined,
    toDate: String(body.toDate ?? "").trim() || undefined,
    includeLogs: body.includeLogs !== false,
    includeInbox: body.includeInbox !== false,
    includeAttachments: body.includeAttachments !== false,
  };
}

export async function POST(request: Request) {
  const jar = await cookies();
  if (jar.get(ARGUS_AUTH)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const scopeType = body.scopeType as ExportScopeType | undefined;
  const scopeId = String(body.scopeId ?? "").trim();
  const includePrivate = Boolean(body.includePrivate);

  if (!scopeType || !SCOPE_TYPES.has(scopeType) || !scopeId) {
    return NextResponse.json({ error: "scopeType and scopeId are required" }, { status: 400 });
  }

  if (includePrivate) {
    if (!argusPrivateConfigured()) {
      return NextResponse.json({ error: "Private export requested but PIN is not configured" }, { status: 400 });
    }
    if (!(await hasArgusPrivateUnlock())) {
      return NextResponse.json({ error: "Private unlock required" }, { status: 403 });
    }
  }

  const options = parseOptions(body);
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const collected = collectVaultEvidence({
    data,
    inboxItems,
    scopeType,
    scopeId,
    includePrivate,
    options,
  });

  if (!collected) {
    return NextResponse.json({ error: "Scope not found or type mismatch" }, { status: 404 });
  }

  const generatedAt = new Date().toISOString();
  const branding = resolveDeliverBranding();
  const html = buildEvidenceDossierHtml({
    data,
    collected,
    generatedAt,
    branding,
    zipMode: false,
  });

  const token = generateShareToken();
  const origin = new URL(request.url).origin;
  const shareUrl = `${origin}/deliver/s/${token}`;

  await saveDeliverShare({
    token,
    scopeName: collected.scope.name,
    scopeType: collected.scope.type,
    preparerName: branding.preparerName,
    createdAt: generatedAt,
    html,
  });

  return NextResponse.json({
    token,
    shareUrl,
    expiresInDays: 30,
    scopeName: collected.scope.name,
  });
}
