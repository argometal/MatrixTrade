/**
 * Deployed UI smoke for MXT 028 (no TSLA fabrication).
 * Logs in, fetches Insights Pipeline HTML, checks Improvement Path markers.
 */
import { readFileSync, existsSync, unlinkSync } from "fs";
import { resolve } from "path";

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
  throw new Error("password missing");
}

async function main() {
  const base = process.env.MXT_PROD_URL?.trim() || "https://argusforge.dev";
  const password = loadPw();

  const loginPage = await fetch(`${base}/login?next=%2Fmxt%2Fstats%3Ftab%3Dpipeline`, {
    redirect: "manual",
  });
  const setCookie = loginPage.headers.getSetCookie?.() ?? [];
  // Next login is form POST — find action
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
  console.log("login_status", loginRes.status, "location", loginRes.headers.get("location"));

  const pipeline = await fetch(`${base}/mxt/stats?tab=pipeline`, {
    headers: { cookie: cookieHeader },
    redirect: "follow",
  });
  const html = await pipeline.text();
  console.log("pipeline_status", pipeline.status, "url", pipeline.url);

  const checks = {
    improvementPath: /data-improvement-path|Improvement Path/i.test(html),
    focusPlan: /improvement-focus-plan|Focus plan/i.test(html),
    pipelineSurface: /data-insights-pipeline-performance|Pipeline/i.test(html),
    notLogin: !/Wrong password|Trading access/i.test(html) || /Improvement Path/i.test(html),
  };
  console.log(JSON.stringify(checks, null, 2));

  if (!checks.improvementPath || !checks.pipelineSurface) {
    // RSC payloads may stream differently — also try stats without auth markers dump length
    console.log("html_len", html.length);
    console.log("snippet", html.slice(0, 400).replace(/\s+/g, " "));
    process.exit(1);
  }
  console.log("MXT 028 deployed UI smoke: PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
