import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: false, // Disabled for WebRTC connections
};

export default nextConfig;
