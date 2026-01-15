import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false, 
      },
    ];
  },

  output: 'export',
  
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.pdamkotasmg.co.id',
        port: '',
        pathname: '/api-gw-dev/file-handler/foto/**', 
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