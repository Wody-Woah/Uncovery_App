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
}

export default nextConfig
