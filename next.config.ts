import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',

  // Disable automatic trailing slashes
  trailingSlash: true, // Opsional, untuk compatibility

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