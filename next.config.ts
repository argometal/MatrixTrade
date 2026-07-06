import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/ai-bridge", destination: "/home-preview", permanent: false },
      { source: "/ai-workspace", destination: "/home-preview", permanent: false },
    ];
  },
};

export default nextConfig;
