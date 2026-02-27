import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://3000-firebase-c-1772080577013.cluster-bqwaigqtxbeautecnatk4o6ynk.cloudworkstations.dev",
  ],
};

export default nextConfig;
