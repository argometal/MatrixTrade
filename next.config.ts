import type { NextConfig } from "next";
import { execSync } from "node:child_process";

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

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_ARGUS_BUILD_SHA: buildSha,
  },
  async redirects() {
    return [
      { source: "/ai-bridge", destination: "/exchange", permanent: false },
      { source: "/ai-workspace", destination: "/exchange", permanent: false },
    ];
  },
};

export default nextConfig;
