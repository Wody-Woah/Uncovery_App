import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import './globals.css'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'The Uncovery Devotional',
  description: 'A daily devotional — one word, one truth, every day.',
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
