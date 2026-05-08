import type { NextConfig } from "next";

import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  reactCompiler: true,
  async redirects() {
    return [
      { destination: "/es/privacy", permanent: false, source: "/privacy" },
      { destination: "/es/terms", permanent: false, source: "/terms" },
    ];
  },
};

export default nextConfig;
