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
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com fonts.googleapis.com data: https://k2mkucxia43oc7fa.public.blob.vercel-storage.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https: wss:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig