/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    externalDir: true,
    serverComponentsExternalPackages: ['faiss-node', 'pickleparser'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.ipfs.dweb.link', pathname: '/**' },
      { protocol: 'https', hostname: 'ipfs.io', pathname: '/**' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud', pathname: '/**' },
      { protocol: 'https', hostname: 'cloudflare-ipfs.com', pathname: '/**' },
      { protocol: 'https', hostname: 'via.placeholder.com', pathname: '/**' },
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  async rewrites() {
    const mlBase =
      process.env.ML_API_URL ||
      process.env.NEXT_PUBLIC_ML_API_URL ||
      'http://localhost:8000';
    return [
      {
        source: '/api/ml/:path*',
        destination: `${mlBase.replace(/\/$/, '')}/api/ml/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
