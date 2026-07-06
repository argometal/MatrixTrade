import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/ai-bridge", destination: "/", permanent: false },
      { source: "/ai-workspace", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
