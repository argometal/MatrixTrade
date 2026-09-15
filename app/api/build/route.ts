import { NextResponse } from "next/server";

/** Public build identity — verify which git SHA Production is serving. */
export const dynamic = "force-dynamic";

export function GET() {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
    "local";
  return NextResponse.json({
    ok: true,
    sha: sha.slice(0, 40),
    shortSha: sha.slice(0, 7),
    env: process.env.VERCEL_ENV ?? "local",
    url: process.env.VERCEL_URL ?? null,
  });
}
