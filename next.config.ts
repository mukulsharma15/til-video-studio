import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler", "remotion"],
  turbopack: {
    root: process.cwd(),
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
