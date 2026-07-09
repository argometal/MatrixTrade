import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/ai-workspace", destination: "/ai-bridge", permanent: true },
      { source: "/exchange", destination: "/ai-bridge", permanent: false },
    ];
  },
};

export default nextConfig;
