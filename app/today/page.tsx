'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Devotion = {
  id: string
  title: string
  verse_reference: string
  verse_text: string | null
  body: string
  prayer: string
  month: number
  day: number
}

type MonthTheme = {
  month: number
  month_name: string
  theme_title: string
  theme_scripture_reference: string
  theme_scripture_text: string | null
}

export default function TodayPage() {
  const router = useRouter()
  const [devotion, setDevotion] = useState<Devotion | null>(null)
  const [theme, setTheme] = useState<MonthTheme | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
    })
  }, [router])

  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    async function fetchData() {
      const [{ data: dev }, { data: thm }] = await Promise.all([
        supabase
          .from('devotions')
          .select('*')
          .eq('month', month)
          .eq('day', day)
          .eq('published', true)
          .single(),
        supabase
          .from('month_themes')
          .select('*')
          .eq('month', month)
          .single(),
      ])
      setDevotion(dev)
      setTheme(thm)
      setLoading(false)
    }

    fetchData()
  }, [month, day])

  if (loading) {
    return (
      <div className="py-20 text-center text-muted text-sm">Loading today&apos;s devotion…</div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Date label */}
      <p className="text-xs uppercase tracking-widest text-muted">{dateLabel}</p>

      {/* Month Theme Card */}
      {theme && (
        <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-steel mb-2">
            {theme.month_name} · Theme
          </p>
          <h2 className="text-lg font-semibold text-charcoal mb-1">{theme.theme_title}</h2>
          <p className="text-sm text-muted italic mb-3">{theme.theme_scripture_reference}</p>
          {theme.theme_scripture_text && (
            <p className="font-serif text-sm text-charcoal/80 border-l-2 border-steel/30 pl-3 leading-relaxed">
              {theme.theme_scripture_text}
            </p>
          )}
        </div>
      )}

      {/* Devotion Card */}
      {devotion ? (
        <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-charcoal mb-1">{devotion.title}</h1>
            <p className="text-sm text-muted">{devotion.verse_reference}</p>
          </div>

          {/* Verse */}
          {devotion.verse_text && (
            <div className="border-l-2 border-steel/40 pl-4 py-1">
              <p className="font-serif italic text-charcoal/80 text-base leading-relaxed">
                {devotion.verse_text}
              </p>
            </div>
          )}

          {/* Body */}
          <div className="font-serif text-charcoal leading-[1.85] whitespace-pre-wrap text-[1.0625rem]">
            {devotion.body}
          </div>

          {/* Prayer */}
          {devotion.prayer && (
            <div className="rounded-xl bg-canvas border border-steel/10 p-5">
              <p className="text-xs uppercase tracking-widest text-steel mb-3">Prayer</p>
              <p className="font-serif italic text-charcoal/90 leading-[1.85]">
                {devotion.prayer}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-steel/20 bg-white p-10 text-center shadow-sm">
          <p className="text-muted text-sm">No devotion found for today.</p>
          <p className="text-muted text-xs mt-1">Check back soon or browse past devotions.</p>
        </div>
      )}
    </div>
  )
}
