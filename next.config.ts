import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fewer parallel page-data workers → fewer SQLite open races on platforms like Railway
  experimental: {
    cpus: 1,
  },
  output: "standalone",
  serverExternalPackages: [],
};

export default nextConfig;
