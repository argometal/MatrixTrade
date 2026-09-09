/**
 * Post-deploy smoke for MXT 029 — login + pipeline markers + contract freshness in RSC payload.
 * Does not fabricate PLAN-001 T0 or mutate production data.
 * Run: npx tsx tools/smoke-mxt-029-deployed.ts
 */
import { readFileSync, existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import {
  buildApplySchemaContract,
  buildApplySchemaContractText,
} from "../lib/apply-schema-contract";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import { MATRIX_MECHANICS_REVISION } from "../lib/matrix-mechanics-snapshot";

function loadPw(): string {
  const tmp = resolve("tools/_pw.tmp");
  if (existsSync(tmp)) {
    const v = readFileSync(tmp, "utf8").trim();
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    return v;
  }
  const envPath = resolve(".env.local.production");
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line.startsWith("MATRIXTRADE_PASSWORD=")) continue;
    let v = line.slice("MATRIXTRADE_PASSWORD=".length).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v;
  }
  throw new Error("password missing (.env.local.production or tools/_pw.tmp)");
}

async function main() {
  // Local source contract (must match what Control generates)
  const contract = buildApplySchemaContract();
  const schemaText = buildApplySchemaContractText();
  const mechanics = buildMatrixMechanicsBrief();
  console.log("local_schemaVersion", contract.schemaVersion);
  console.log("local_mechanics_revision", MATRIX_MECHANICS_REVISION);
  console.log(
    "local_accepted_thesis-t0",
    contract.acceptedTypes.includes("thesis-t0")
  );
  console.log(
    "local_no_immutable_t0_rule",
    !mechanics.includes("Does NOT rewrite frozen T0") &&
      !mechanics.includes("Case/T0 stay immutable")
  );
  console.log(
    "local_schema_has_repairKind",
    schemaText.includes("repairKind=corrected")
  );

  const base = process.env.MXT_PROD_URL?.trim() || "https://argusforge.dev";
  const password = loadPw();

  const loginPage = await fetch(
    `${base}/login?next=%2Fmxt%2Fstats%3Ftab%3Dpipeline`,
    { redirect: "manual" }
  );
  const setCookie = loginPage.headers.getSetCookie?.() ?? [];
  const loginRes = await fetch(`${base}/login`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: setCookie.map((c) => c.split(";")[0]).join("; "),
    },
    body: new URLSearchParams({
      password,
      next: "/mxt/stats?tab=pipeline",
    }),
    redirect: "manual",
  });
  const cookies = [
    ...setCookie,
    ...(loginRes.headers.getSetCookie?.() ?? []),
  ].map((c) => c.split(";")[0]);
  const cookieHeader = cookies.join("; ");
  console.log(
    "login_status",
    loginRes.status,
    "location",
    loginRes.headers.get("location")
  );

  const pipeline = await fetch(`${base}/mxt/stats?tab=pipeline`, {
    headers: { cookie: cookieHeader },
    redirect: "follow",
  });
  const html = await pipeline.text();
  console.log("pipeline_status", pipeline.status, "html_len", html.length);

  const checks = {
    improvementPath: /data-improvement-path|Improvement Path/i.test(html),
    focusSelect: /improvement-focus-plan|Select plan/i.test(html),
    plan001: /PLAN-001/i.test(html),
    plan009: /PLAN-009/i.test(html),
    missingT0: /Missing T0/i.test(html),
    readonlyBannerAbsent:
      !/data-testid=\"improvement-readonly-banner\"/i.test(html) &&
      !/Read-only runtime/i.test(html),
    schemaFreshnessInPayload: /2026-09-05\.mxt-029-correctability/.test(html),
    thesisT0InPayload: /thesis-t0/.test(html),
    notLoginWall: !/Wrong password/i.test(html),
  };
  console.log(JSON.stringify(checks, null, 2));

  // Home / trading shell for Control is heavier — fetch home and search for mechanics rev if present
  const home = await fetch(`${base}/mxt/home-preview`, {
    headers: { cookie: cookieHeader },
    redirect: "follow",
  });
  const homeHtml = await home.text();
  console.log(
    "home_status",
    home.status,
    "schema_in_home",
    /2026-09-05\.mxt-029-correctability/.test(homeHtml),
    "thesis-t0_in_home",
    /thesis-t0/.test(homeHtml),
    "mechanics_rev45",
    /mechanics_revision:45|MATRIX_MECHANICS_REVISION|revision.?45/i.test(
      homeHtml
    )
  );

  const fail =
    !checks.improvementPath ||
    !checks.plan001 ||
    !checks.plan009 ||
    !checks.notLoginWall ||
    !contract.acceptedTypes.includes("thesis-t0") ||
    contract.schemaVersion !== "2026-09-08.mxt-032-direct-t0" ||
    MATRIX_MECHANICS_REVISION < 45;

  if (fail) {
    console.error("SMOKE FAIL");
    process.exit(1);
  }
  console.log("SMOKE PASS (deployed pipeline + local contract freshness)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
