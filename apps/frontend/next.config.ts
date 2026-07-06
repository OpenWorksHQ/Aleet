import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: monorepoRoot,
  },
  outputFileTracingRoot: monorepoRoot,
  // Permanent apex → www redirect (308). Google treats 308 like 301 for indexing.
  // Replaces Vercel's default 307 domain redirect when both hosts point at this project.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "aleet.app" }],
        destination: "https://www.aleet.app/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
