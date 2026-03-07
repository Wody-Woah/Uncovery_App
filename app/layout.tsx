import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import './globals.css'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'The Uncovery Devotional',
  description: 'Daily devotionals designed for reflection, recovery, and spiritual growth.',
  openGraph: {
    title: 'The Uncovery Devotional',
    description: 'Daily devotionals designed for reflection, recovery, and spiritual growth.',
    url: 'https://uncoverydevotional.com',
    type: 'website',
    images: [
      {
        url: 'https://uncoverydevotional.com/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="relative min-h-screen">
          {/* Fixed background: image + overlay sit behind all content */}
          <div className="fixed inset-0 -z-10">
            <Image
              src="/login-hero.jpg"
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>

          <Header />
          <main className="mx-auto max-w-reading px-4 pt-10 pb-24 md:pb-10">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  )
}
