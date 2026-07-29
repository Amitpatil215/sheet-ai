import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Admin SDK outside the Turbopack bundle (native deps + CJS).
  serverExternalPackages: ["firebase-admin"],
  // Firebase Google popup needs window.closed across origins.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
