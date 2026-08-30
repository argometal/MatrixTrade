import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { MXT_LEGACY_PREFIXES } from "./lib/mxt-paths";

function resolveBuildSha(): string {
  const vercel = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (vercel) return vercel.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "dev";
  }
}

const buildSha = resolveBuildSha();

/** Legacy trading URLs → canonical /mta/* (query strings preserved by Next). */
function legacyMxtRedirects() {
  const redirects: {
    source: string;
    destination: string;
    permanent: boolean;
  }[] = [];

  for (const prefix of MXT_LEGACY_PREFIXES) {
    redirects.push({
      source: prefix,
      destination: `/mta${prefix}`,
      permanent: false,
    });
    redirects.push({
      source: `${prefix}/:path*`,
      destination: `/mta${prefix}/:path*`,
      permanent: false,
    });
  }

  return redirects;
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  env: {
    NEXT_PUBLIC_ARGUS_BUILD_SHA: buildSha,
  },
  async redirects() {
    return [
      { source: "/mta", destination: "/mta/home-preview", permanent: false },
      { source: "/ai-workspace", destination: "/mta/ai-bridge", permanent: true },
      { source: "/mta/ai-workspace", destination: "/mta/ai-bridge", permanent: true },
      { source: "/exchange", destination: "/mta/ai-bridge", permanent: false },
      { source: "/mta/exchange", destination: "/mta/ai-bridge", permanent: false },
      { source: "/review", destination: "/mta/trades?tab=review", permanent: false },
      { source: "/mta/review", destination: "/mta/trades?tab=review", permanent: false },
      { source: "/journal", destination: "/mta/stats?tab=journal", permanent: false },
      { source: "/mta/journal", destination: "/mta/stats?tab=journal", permanent: false },
      { source: "/mistakes", destination: "/mta/stats?tab=mistakes", permanent: false },
      { source: "/mta/mistakes", destination: "/mta/stats?tab=mistakes", permanent: false },
      ...legacyMxtRedirects(),
    ];
  },
  async rewrites() {
    return [
      // Internal: serve existing App Router pages under /mta URL space.
      { source: "/mta/:path*", destination: "/:path*" },
    ];
  },
};

export default nextConfig;
