import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow Node built-in sqlite in server components / route handlers
  },
  serverExternalPackages: [],
};

export default nextConfig;
