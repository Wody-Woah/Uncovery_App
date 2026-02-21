import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'

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
          <main className="mx-auto max-w-reading px-4 py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
