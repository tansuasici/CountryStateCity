import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  transpilePackages: ["@heroui/react", "@heroui/theme"],
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react"],
  },
};

export default nextConfig;
