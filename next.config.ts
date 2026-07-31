import type { NextConfig } from "next";

/**
 * GitHub Pages static export (enable later when deploying):
 *   output: "export",
 *   basePath: "/japanese-house-3d", // repo name
 *   images: { unoptimized: true },
 */
const nextConfig: NextConfig = {
  // Keep default for local dev; switch to static export at deploy time.
  reactStrictMode: true,
};

export default nextConfig;
