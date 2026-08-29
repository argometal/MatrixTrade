import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** F1 skeleton — packaging proof only. No product routes or domain. */
const nextConfig: NextConfig = {
  // Nested app: keep file tracing rooted here (not parent monolith lockfile).
  outputFileTracingRoot: appDir,
};

export default nextConfig;
