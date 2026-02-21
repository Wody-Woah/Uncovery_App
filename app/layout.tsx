import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'The Uncovery',
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
        <div className="min-h-screen bg-canvas">
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
