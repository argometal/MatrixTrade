import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/ai-workspace", destination: "/ai-bridge", permanent: true }];
  },
};

export default nextConfig;
