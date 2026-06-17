import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: monorepoRoot,
  },
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
