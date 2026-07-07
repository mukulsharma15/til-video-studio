import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler", "remotion"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
