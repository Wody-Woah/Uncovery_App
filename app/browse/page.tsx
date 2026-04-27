'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import DevotionCalendar from '@/components/DevotionCalendar'

export default function BrowsePage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
    })
  }, [router])

  const now = new Date()

  return (
    <div className="space-y-8">
      <div className="text-center space-y-1">
        <h1 className="font-display text-3xl font-bold text-brand-blue text-shadow-hero">Browse Devotions</h1>
        <p className="text-sm text-white/80 text-shadow-hero">
          Catch up on a missed day, read ahead, or revisit a past devotion.
        </p>
      </div>

      <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-widest text-steel mb-4">Select a Date</p>
        <DevotionCalendar
          initialMonth={now.getMonth() + 1}
          initialDay={now.getDate()}
          onSelect={(month, day) => router.push(`/devotion/${month}/${day}`)}
        />
      </div>
    </div>
  )
}
