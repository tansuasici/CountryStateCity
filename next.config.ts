import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@heroui/react", "@heroui/theme"],
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react"],
  },
};

export default nextConfig;
