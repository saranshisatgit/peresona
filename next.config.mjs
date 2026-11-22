import nextMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
  poweredByHeader: false,
  outputFileTracingIncludes: {
    '/articles/*': ['./src/app/articles/**/*.mdx'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cdn.sanity.io',
      },
      {
        protocol: 'https',
        hostname: '**.sanity.io',
      },
      {
        protocol: 'https',
        hostname: '**.cloud.appwrite.io',
      },
      {
        protocol: 'https',
        hostname: '**.appwrite.io',
      },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'

    // Next.js needs unsafe-eval in dev (HMR) and unsafe-inline for its
    // hydration scripts; Studio (embedded Sanity) talks to *.sanity.io.
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.sanity.io https://*.sanity.io",
      "font-src 'self' data:",
      "connect-src 'self' https://*.sanity.io https://*.api.sanity.io wss://*.sanity.io https://challenges.cloudflare.com",
      "frame-src 'self' https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      // Studio is rendered inside the same origin; allow Studio's own
      // frame handling but keep third-party framing blocked via CSP.
      {
        source: '/studio/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'"),
          },
        ],
      },
    ]
  },
}

const withMDX = nextMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: ['remark-gfm'],
    rehypePlugins: ['@mapbox/rehype-prism'],
  },
})

export default withMDX(nextConfig)
