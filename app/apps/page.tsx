import type { Metadata } from "next";
import { ForgeHomePortal } from "./components/ForgeHomePortal";

export const metadata: Metadata = {
  title: "ARGUS FORGE — Home",
  description: "Your systems. One workspace.",
};

export const dynamic = "force-dynamic";

/**
 * ARGUS FORGE portal home.
 * - Left A mark + wordmark = Home (this page)
 * - Right A mark = systems menu (Forge Home + apps; replaces ···)
 */
export default function AppsHubPage() {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
    "local";
  const shortSha = sha.slice(0, 7);
  const env = process.env.VERCEL_ENV ?? "local";

  return (
    <>
      <ForgeHomePortal />
      <p
        className="pointer-events-none fixed bottom-2 right-2 z-50 rounded bg-black/70 px-2 py-1 font-mono text-[10px] text-zinc-400"
        data-testid="build-chip"
        title="Deployed git SHA"
      >
        build {shortSha} · {env}
      </p>
    </>
  );
}
