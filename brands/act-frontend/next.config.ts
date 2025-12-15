import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable domain handling for multi-tenant subdomains
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.leonardo.ai',
        port: '',
        pathname: '/**',
      },
      // Allow all subdomains of onbrand.ai for images
      {
        protocol: 'https',
        hostname: '**.onbrandai.app',
      },
    ],
  },
  // Enable hostname rewrites for multi-tenant setup
  async rewrites() {
    return {
      beforeFiles: [
        // Handle subdomain routing
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>.+)\\.onbrandai\\.app',
            },
          ],
          destination: '/brand/:subdomain/:path*',
        },
      ],
    };
  },
  // Disable TypeScript type checking during production build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during production build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Use standalone output for better compatibility
  output: 'standalone',
  // Skip static generation for problematic routes
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
