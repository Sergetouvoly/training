import type { NextConfig } from "next";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: `${API_URL}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;
