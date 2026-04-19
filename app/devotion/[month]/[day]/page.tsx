'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getTodayET, getETDateString } from '@/lib/getTodayET'
import DevotionCard from '@/components/DevotionCard'
import AnimatedCard from '@/components/AnimatedCard'

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

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function DevotionPage() {
  const params = useParams()
  const router = useRouter()
  const month = Number(params.month)
  const day = Number(params.day)

  const [devotion, setDevotion] = useState<Devotion | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)
  const [marked, setMarked] = useState(false)
  const [marking, setMarking] = useState(false)
  const { year: currentYear } = getTodayET()
  const todayStr = getETDateString()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const [bmRes, readRes] = await Promise.all([
        supabase.from('bookmarks').select('month').eq('user_id', user.id).eq('month', month).eq('day', day).maybeSingle(),
        supabase.from('devotion_reads').select('read_on').eq('user_id', user.id).eq('month', month).eq('day', day).eq('year', currentYear).maybeSingle(),
      ])
      if (bmRes.data) setBookmarked(true)
      if (readRes.data) setMarked(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, month, day])

  async function handleMarkRead() {
    if (!userId || marked || marking) return
    setMarking(true)
    const { error } = await supabase
      .from('devotion_reads')
      .insert({ user_id: userId, month, day, year: currentYear, read_on: todayStr })
    if (!error || error.code === '23505') setMarked(true)
    setMarking(false)
  }

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

  useEffect(() => {
    if (isNaN(month) || isNaN(day)) {
      setNotFound(true)
      setLoading(false)
      return
    }

    async function fetchDevotion() {
      const { data, error } = await supabase
        .from('devotions')
        .select('*')
        .eq('month', month)
        .eq('day', day)
        .eq('published', true)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setDevotion(data)
      }
      setLoading(false)
    }

    fetchDevotion()
  }, [month, day])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-20 rounded bg-white/20 animate-pulse" />
        <div className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-5 animate-pulse">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-steel/10" />
            <div className="h-6 w-3/4 rounded bg-steel/10" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-2/5 rounded bg-steel/10" />
            <div className="h-3 w-full rounded bg-steel/10" />
            <div className="h-3 w-4/5 rounded bg-steel/10" />
          </div>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`h-3 rounded bg-steel/10 ${i === 3 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
          <div className="h-10 w-36 rounded-xl bg-steel/10" />
        </div>
      </div>
    )
  }

  const monthName = MONTH_NAMES[month] ?? ''

  if (notFound || !devotion) {
    return (
      <div className="space-y-6">
        <button onClick={() => router.back()} className="text-sm text-brand-blue hover:underline text-shadow-hero">
          ← Back
        </button>
        <AnimatedCard>
          <div className="rounded-2xl border border-steel/20 bg-white p-10 text-center shadow-sm">
            <p className="text-muted text-sm">
              No devotion found for {monthName} {day}.
            </p>
          </div>
        </AnimatedCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => router.back()} className="text-brand-blue hover:underline text-shadow-hero">
          ← Back
        </button>
        <span className="text-white text-shadow-hero">/</span>
        <span className="text-white text-shadow-hero">
          {monthName} {day}
        </span>
      </div>

      {/* Devotion Card */}
      <AnimatedCard>
        <DevotionCard
          devotion={devotion}
          userId={userId}
          bookmarked={bookmarked}
          bookmarking={bookmarking}
          onBookmarkToggle={handleBookmarkToggle}
          marked={marked}
          marking={marking}
          onMarkRead={handleMarkRead}
          showStreakMessage={false}
        />
      </AnimatedCard>
    </div>
  )
}
