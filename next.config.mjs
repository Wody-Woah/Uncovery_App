/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yaexxxbkjqkqyncpbeoe.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
}

export default nextConfig
