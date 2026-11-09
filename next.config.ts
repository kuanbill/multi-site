import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/bardcode',
          destination: 'http://ur-landagent-barcode:3000/bardcode/',
        },
        {
          source: '/bardcode/:path*',
          destination: 'http://ur-landagent-barcode:3000/bardcode/:path*',
        },
        {
          source: '/common_charge_tool/:path*',
          destination: 'http://common-charge-tool:8000/common_charge_tool/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
