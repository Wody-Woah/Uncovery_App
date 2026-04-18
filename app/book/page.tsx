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
    return <div className="py-20 text-center text-muted text-sm">Loading…</div>
  }

  return (
    <div className="flex flex-col items-center py-8 w-full">
      <AnimatedCard>
      <div className="w-full rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-6 text-center">
        <div>
          <p className="text-xs uppercase tracking-widest text-steel mb-2">
            The Uncovery Devotional
          </p>
          <h1 className="text-2xl font-semibold text-charcoal">Get the Book</h1>
        </div>

        <div className="w-full max-w-xs mx-auto">
          <Image
            src="/book.jpg"
            alt="The Uncovery Devotional book cover"
            width={970}
            height={600}
            sizes="(max-width: 768px) 90vw, 320px"
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
