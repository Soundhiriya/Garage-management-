import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  // Allows opening the dev server from a phone/tablet on the same LAN via this PC's IP.
  allowedDevOrigins: ["192.168.31.96"]
};

export default nextConfig;
