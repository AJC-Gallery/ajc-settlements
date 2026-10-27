import type { NextConfig } from "next";
import { webConfig } from "./src/config/web-config";

// The browser only ever talks to this origin; /api is forwarded to the API (Master document, architecture).
const nextConfig: NextConfig = {
  transpilePackages: ["@ajc/contracts"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${webConfig.apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;