import path from 'path'
import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), geolocation=(), microphone=()',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
]

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: process.env.NODE_ENV === 'production'
          ? [
            ...securityHeaders,
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000',
            },
          ]
          : securityHeaders,
      },
    ]
  },
};

export default nextConfig;
