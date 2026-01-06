/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Rewrite /chat to /dashboard/chat so URL stays clean
  async rewrites() {
    return [
      {
        source: '/chat',
        destination: '/dashboard/chat',
      },
    ];
  },
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
  // Note: Subdomain brand detection is handled by middleware via x-brand-subdomain header
  // No rewrites needed - all routes work the same on any subdomain
  // Disable TypeScript type checking during production build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Use standalone output for better performance in production
  output: 'standalone',
  
  // Externalize packages that use browser APIs not available in Node.js build
  serverExternalPackages: ['@ai-sdk/mcp'],
  
  // Configure Turbopack to not bundle problematic packages
  turbopack: {
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
};

export default nextConfig;
