/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/src/legal/:path*',
        destination: '/legal/:path*',
      },
      {
        source: '/bapi/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
  webpack: (config) => {
    // Allow importing of HTML files
    config.module.rules.push({
      test: /\.html$/,
      use: 'raw-loader',
    });
    
    return config;
  },
};

module.exports = nextConfig;