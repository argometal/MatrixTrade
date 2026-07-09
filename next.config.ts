import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/ai-bridge", destination: "/exchange", permanent: false },
      { source: "/ai-workspace", destination: "/exchange", permanent: false },
    ];
  },
};

export default nextConfig;
