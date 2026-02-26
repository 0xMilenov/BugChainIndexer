import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/getAddressesByFilter", destination: `${apiUrl}/getAddressesByFilter` },
      { source: "/getContractCount", destination: `${apiUrl}/getContractCount` },
      { source: "/getVerifiedContractStats", destination: `${apiUrl}/getVerifiedContractStats` },
      { source: "/networkCounts", destination: `${apiUrl}/networkCounts` },
      { source: "/nativePrices", destination: `${apiUrl}/nativePrices` },
      { source: "/searchByCode", destination: `${apiUrl}/searchByCode` },
      { source: "/addContract", destination: `${apiUrl}/addContract` },
      { source: "/bookmarks", destination: `${apiUrl}/bookmarks` },
      { source: "/bookmarks/:path*", destination: `${apiUrl}/bookmarks/:path*` },
      { source: "/health", destination: `${apiUrl}/health` },
      // Auth: route handlers at app/auth/*/route.ts proxy to backend with explicit cookie forwarding
      // /api/contract/*: app/api/contract/[...path]/route.ts proxies with cookie forwarding (rewrites don't)
    ];
  },
};

export default nextConfig;
