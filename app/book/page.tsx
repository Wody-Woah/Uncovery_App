'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import AnimatedCard from '@/components/AnimatedCard'

export default function BookPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setReady(true)
    })
  }, [router])

  if (!ready) {
    return (
      <div className="space-y-6 pt-12">
        <div className="h-14 w-48 rounded bg-white/20 animate-pulse mx-auto" />
        <div className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-6 animate-pulse">
          <div className="w-full max-w-xs mx-auto h-48 rounded-xl bg-steel/10" />
          <div className="h-12 w-full rounded-xl bg-steel/10" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pt-12">
      <h1 className="font-display text-6xl font-bold text-brand-blue text-shadow-hero text-center">Get the Book</h1>
      <AnimatedCard>
        <div className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-6 text-center">
          <p className="text-xs uppercase tracking-widest text-steel">The Uncovery Devotional</p>

          <div className="w-full max-w-xs md:max-w-full mx-auto">
            <Image
              src="/book.jpg"
              alt="The Uncovery Devotional book cover"
              width={970}
              height={600}
              sizes="(max-width: 768px) 90vw, 640px"
              className="w-full h-auto rounded-xl shadow-md"
            />
          </div>

          <a
            href="https://a.co/d/078elRSp"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl bg-steel px-4 py-3 text-center text-sm font-medium text-white hover:bg-steel/90 transition-colors"
          >
            Buy the Book on Amazon
          </a>
        </div>
      </AnimatedCard>
    </div>
  )
}
