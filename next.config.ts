import type { NextConfig } from "next";

/**
 * Cache Components are intentionally OFF: every console page is rendered
 * per request with the signed-in admin's token, and privileged data must
 * never be cached. Security headers + CSP are set per request in src/proxy.ts.
 */
const nextConfig: NextConfig = {
  // Minimal self-contained server for the Docker image (see Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
