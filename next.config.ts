import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix workspace root warning
  outputFileTracingRoot: __dirname,
  
  // External packages for server components
  serverExternalPackages: ['bullmq', 'ioredis'],
};

export default nextConfig;
