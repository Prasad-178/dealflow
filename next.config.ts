import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
