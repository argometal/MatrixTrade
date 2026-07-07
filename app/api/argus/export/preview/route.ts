import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ARGUS_AUTH } from "@/lib/auth/cookies";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { buildExportPreviewSummary } from "@/lib/argus/export/preview";
import type { ExportCollectionOptions, ExportScopeType } from "@/lib/argus/export/types";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";

const SCOPE_TYPES = new Set<ExportScopeType>([
  "person",
  "project",
  "organization",
  "topic",
  "event",
]);

function parseOptions(searchParams: URLSearchParams): ExportCollectionOptions {
  return {
    fromDate: searchParams.get("fromDate")?.trim() || undefined,
    toDate: searchParams.get("toDate")?.trim() || undefined,
    includeLogs: searchParams.get("includeLogs") !== "0",
    includeInbox: searchParams.get("includeInbox") !== "0",
    includeAttachments: searchParams.get("includeAttachments") !== "0",
  };
}

export async function GET(request: Request) {
  const jar = await cookies();
  if (jar.get(ARGUS_AUTH)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const scopeType = url.searchParams.get("scopeType") as ExportScopeType | null;
  const scopeId = url.searchParams.get("scopeId")?.trim() ?? "";
  const includePrivate = url.searchParams.get("includePrivate") === "1";

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

  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const summary = buildExportPreviewSummary({
    data,
    inboxItems,
    scopeType,
    scopeId,
    includePrivate,
    options: parseOptions(url.searchParams),
  });

  if (!summary) {
    return NextResponse.json({ error: "Scope not found or type mismatch" }, { status: 404 });
  }

  return NextResponse.json(summary);
}
