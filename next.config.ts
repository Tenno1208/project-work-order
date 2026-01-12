import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.pdamkotasmg.co.id',
        port: '',
        pathname: '/api-gw-balanced/file-handler/foto/**', 
      },
      {
        protocol: 'https',
        hostname: 'domain.com', 
        port: '',
        pathname: '/uploads/ttd/**', 
      },
    ],
  },
};

export default nextConfig;