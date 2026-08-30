import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { MXT_BASE, MXT_COMPAT_BASE, MXT_LEGACY_PREFIXES } from "./lib/mxt-paths";

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

/** Unprefixed trading URLs → canonical /mxt/* (query strings preserved by Next). */
function legacyRootRedirects() {
  const redirects: {
    source: string;
    destination: string;
    permanent: boolean;
  }[] = [];

  for (const prefix of MXT_LEGACY_PREFIXES) {
    redirects.push({
      source: prefix,
      destination: `${MXT_BASE}${prefix}`,
      permanent: false,
    });
    redirects.push({
      source: `${prefix}/:path*`,
      destination: `${MXT_BASE}${prefix}/:path*`,
      permanent: false,
    });
  }

  return redirects;
}

/** Temporary /mta/* → canonical /mxt/*. */
function mtaCompatRedirects() {
  return [
    { source: MXT_COMPAT_BASE, destination: `${MXT_BASE}/home-preview`, permanent: false },
    {
      source: `${MXT_COMPAT_BASE}/:path*`,
      destination: `${MXT_BASE}/:path*`,
      permanent: false,
    },
  ];
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  env: {
    NEXT_PUBLIC_ARGUS_BUILD_SHA: buildSha,
  },
  async redirects() {
    return [
      { source: MXT_BASE, destination: `${MXT_BASE}/home-preview`, permanent: false },
      { source: "/ai-workspace", destination: `${MXT_BASE}/ai-bridge`, permanent: true },
      { source: `${MXT_BASE}/ai-workspace`, destination: `${MXT_BASE}/ai-bridge`, permanent: true },
      { source: `${MXT_COMPAT_BASE}/ai-workspace`, destination: `${MXT_BASE}/ai-bridge`, permanent: true },
      { source: "/exchange", destination: `${MXT_BASE}/ai-bridge`, permanent: false },
      { source: `${MXT_BASE}/exchange`, destination: `${MXT_BASE}/ai-bridge`, permanent: false },
      { source: `${MXT_COMPAT_BASE}/exchange`, destination: `${MXT_BASE}/ai-bridge`, permanent: false },
      { source: "/review", destination: `${MXT_BASE}/trades?tab=review`, permanent: false },
      { source: `${MXT_BASE}/review`, destination: `${MXT_BASE}/trades?tab=review`, permanent: false },
      { source: `${MXT_COMPAT_BASE}/review`, destination: `${MXT_BASE}/trades?tab=review`, permanent: false },
      { source: "/journal", destination: `${MXT_BASE}/stats?tab=journal`, permanent: false },
      { source: `${MXT_BASE}/journal`, destination: `${MXT_BASE}/stats?tab=journal`, permanent: false },
      { source: `${MXT_COMPAT_BASE}/journal`, destination: `${MXT_BASE}/stats?tab=journal`, permanent: false },
      { source: "/mistakes", destination: `${MXT_BASE}/stats?tab=mistakes`, permanent: false },
      { source: `${MXT_BASE}/mistakes`, destination: `${MXT_BASE}/stats?tab=mistakes`, permanent: false },
      { source: `${MXT_COMPAT_BASE}/mistakes`, destination: `${MXT_BASE}/stats?tab=mistakes`, permanent: false },
      ...mtaCompatRedirects(),
      ...legacyRootRedirects(),
    ];
  },
  async rewrites() {
    return [
      // Internal: serve existing App Router pages under /mxt URL space.
      { source: `${MXT_BASE}/:path*`, destination: "/:path*" },
    ];
  },
};

export default nextConfig;
