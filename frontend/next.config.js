/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "font-src 'self' fonts.gstatic.com fonts.googleapis.com data:;",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig