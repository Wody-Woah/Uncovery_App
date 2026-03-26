'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import { getTodayET, getETDateString } from '@/lib/getTodayET'
import DevotionCard from '@/components/DevotionCard'

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
  const [userId, setUserId] = useState<string | null>(null)
  const [marked, setMarked] = useState(false)
  const [marking, setMarking] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)

  const { month, day } = getTodayET()
  const todayStr = getETDateString()

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUserId(user.id)

        // Fetch devotion, theme, read status, and bookmark status together after auth
        const [{ data: dev }, { data: thm }, readRes, bmRes] = await Promise.all([
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
          supabase
            .from('devotion_reads')
            .select('read_on')
            .eq('user_id', user.id)
            .eq('read_on', todayStr)
            .maybeSingle(),
          supabase
            .from('bookmarks')
            .select('month')
            .eq('user_id', user.id)
            .eq('month', month)
            .eq('day', day)
            .maybeSingle(),
        ])
        setDevotion(dev)
        setTheme(thm)
        if (readRes.data) setMarked(true)
        if (bmRes.data) setBookmarked(true)
      } catch {
        // fall through and show the page without crashing
      } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function handleBookmarkToggle() {
    if (!userId || bookmarking) return
    setBookmarking(true)
    if (bookmarked) {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('month', month)
        .eq('day', day)
      setBookmarked(false)
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert({ user_id: userId, month, day })
      if (!error || error.code === '23505') setBookmarked(true)
    }
    setBookmarking(false)
  }

  async function handleMarkRead() {
    if (!userId || marked || marking) return
    setMarking(true)
    const { error } = await supabase
      .from('devotion_reads')
      .insert({ user_id: userId, month, day, read_on: todayStr })
    // Treat duplicate (23505) or no error both as success
    if (!error || error.code === '23505') setMarked(true)
    setMarking(false)
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (loading) {
    return (
      <div className="py-20 text-center text-white font-semibold text-sm text-shadow-hero">Loading today&apos;s devotion…</div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Date label */}
      <p className="text-xs uppercase tracking-widest text-brand-blue text-shadow-hero">{dateLabel}</p>

      {/* Month Theme Card */}
      {theme && (
        <div className="relative rounded-2xl overflow-hidden shadow-sm min-h-[180px]">
          <Image
            src={supabase.storage.from('themes').getPublicUrl(`month-${String(month).padStart(2, '0')}.jpg`).data.publicUrl}
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/75" />
          <div className="relative z-10 p-6">
            <p className="text-xs uppercase tracking-widest text-white/70 mb-2">
              {theme.month_name} · Theme
            </p>
            <h2 className="text-lg font-semibold text-white mb-1">{theme.theme_title}</h2>
            <p className="text-sm text-white/70 italic mb-3">{theme.theme_scripture_reference}</p>
            {theme.theme_scripture_text && (
              <p className="font-serif text-sm text-white/85 border-l-2 border-white/40 pl-3 leading-relaxed">
                {theme.theme_scripture_text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Devotion Card */}
      {devotion ? (
        <DevotionCard
          devotion={devotion}
          userId={userId}
          bookmarked={bookmarked}
          bookmarking={bookmarking}
          onBookmarkToggle={handleBookmarkToggle}
          marked={marked}
          marking={marking}
          onMarkRead={handleMarkRead}
        />
      ) : (
        <div className="rounded-2xl border border-steel/20 bg-white p-10 text-center shadow-sm">
          <p className="text-muted text-sm">No devotion found for today.</p>
          <p className="text-muted text-xs mt-1">Check back soon or browse past devotions.</p>
        </div>
      )}
    </div>
  )
}
