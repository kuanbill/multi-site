import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/common_charge_tool/:path*',
          destination: 'http://common-charge-tool:8000/common_charge_tool/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
