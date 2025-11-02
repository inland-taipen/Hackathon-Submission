/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Skip static page generation for pages that use hooks
  output: 'standalone',
  // Allow dynamic routes to be built
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig

