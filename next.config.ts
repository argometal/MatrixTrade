import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/ai-bridge", destination: "/ai-workspace", permanent: false }];
  },
};

export default nextConfig;
