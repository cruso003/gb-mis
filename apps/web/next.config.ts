import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
  // Proxy API requests to NestJS in development
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
