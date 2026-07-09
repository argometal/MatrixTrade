import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ARGUS_AUTH, hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { collectVaultEvidence } from "@/lib/argus/export/collect-evidence";
import {
  buildQuickDeliverSummary,
  buildQuickPackageMarkdown,
} from "@/lib/argus/export/packages/quick-package";
import { buildQuickPackageHtml } from "@/lib/argus/export/packages/quick-package-html";
import type { ExportCollectionOptions, ExportScopeType } from "@/lib/argus/export/types";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";

const SCOPE_TYPES = new Set<ExportScopeType>([
  "person",
  "project",
  "organization",
  "topic",
  "event",
]);

function safeFileToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "export";
}

function parseOptions(searchParams: URLSearchParams): ExportCollectionOptions {
  return {
    fromDate: searchParams.get("fromDate")?.trim() || undefined,
    toDate: searchParams.get("toDate")?.trim() || undefined,
    includeLogs: searchParams.get("includeLogs") !== "0",
    includeInbox: searchParams.get("includeInbox") !== "0",
    includeAttachments: searchParams.get("includeAttachments") !== "0",
  };
}


async function buildQuickDeliver(searchParams: URLSearchParams) {
  const jar = await cookies();
  if (jar.get(ARGUS_AUTH)?.value !== "1") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const scopeType = searchParams.get("scopeType") as ExportScopeType | null;
  const scopeId = searchParams.get("scopeId")?.trim() ?? "";
  const includePrivate = searchParams.get("includePrivate") === "1";

  if (!scopeType || !SCOPE_TYPES.has(scopeType) || !scopeId) {
    return { error: NextResponse.json({ error: "scopeType and scopeId are required" }, { status: 400 }) };
  }

  if (includePrivate) {
    if (!argusPrivateConfigured()) {
      return {
        error: NextResponse.json({ error: "Private export requested but PIN is not configured" }, { status: 400 }),
      };
    }
    if (!(await hasArgusPrivateUnlock())) {
      return { error: NextResponse.json({ error: "Private unlock required" }, { status: 403 }) };
    }
  }

  const options = parseOptions(searchParams);
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
    return { error: NextResponse.json({ error: "Scope not found or type mismatch" }, { status: 404 }) };
  }

  const generatedAt = new Date().toISOString();
  const today = generatedAt.slice(0, 10);
  const markdown = buildQuickPackageMarkdown({
    data,
    inboxItems,
    collected,
    includePrivate,
    today,
    generatedAt,
  });
  const html = buildQuickPackageHtml({
    data,
    inboxItems,
    collected,
    includePrivate,
    today,
    generatedAt,
  });
  const summary = buildQuickDeliverSummary(collected, generatedAt);

  return { markdown, html, summary, scopeType, scopeName: collected.scope.name };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await buildQuickDeliver(url.searchParams);
  if ("error" in result && result.error) return result.error;

  const download = url.searchParams.get("download") === "1";
  const format = url.searchParams.get("format") === "md" ? "md" : "html";
  if (download) {
    const stamp = result.summary!.generatedAt.slice(0, 10);
    const filename = `argus-quick-${result.summary!.scopeType}-${safeFileToken(result.summary!.scopeName)}-${stamp}.${format === "md" ? "md" : "html"}`;
    const body = format === "md" ? result.markdown! : result.html!;
    const contentType =
      format === "md" ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8";
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Argus-Package": "quick_package",
        "X-Argus-Format": format,
      },
    });
  }

  return NextResponse.json({
    markdown: result.markdown,
    html: result.html,
    summary: result.summary,
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const params = new URLSearchParams();
  if (body.scopeType) params.set("scopeType", String(body.scopeType));
  if (body.scopeId) params.set("scopeId", String(body.scopeId));
  params.set("includePrivate", body.includePrivate ? "1" : "0");
  if (body.fromDate) params.set("fromDate", String(body.fromDate));
  if (body.toDate) params.set("toDate", String(body.toDate));
  params.set("includeLogs", body.includeLogs === false ? "0" : "1");
  params.set("includeInbox", body.includeInbox === false ? "0" : "1");
  params.set("includeAttachments", body.includeAttachments === false ? "0" : "1");

  const result = await buildQuickDeliver(params);
  if ("error" in result && result.error) return result.error;

  const format = body.format === "md" ? "md" : "html";
  const stamp = result.summary!.generatedAt.slice(0, 10);
  const filename = `argus-quick-${result.summary!.scopeType}-${safeFileToken(result.summary!.scopeName)}-${stamp}.${format === "md" ? "md" : "html"}`;
  const payload = format === "md" ? result.markdown! : result.html!;
  const contentType =
    format === "md" ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8";

  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Argus-Package": "quick_package",
      "X-Argus-Format": format,
    },
  });
}
