'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import { getTodayET, getETDateString } from '@/lib/getTodayET'
import DevotionCard from '@/components/DevotionCard'
import AnimatedCard from '@/components/AnimatedCard'
import DevotionCalendar from '@/components/DevotionCalendar'
import { Devotion } from '@/lib/types'

type MonthTheme = {
  month: number
  month_name: string
  theme_title: string
  theme_scripture_reference: string
  theme_scripture_text: string | null
}

function TodayPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromGroupId = searchParams.get('from') === 'group' ? searchParams.get('groupId') : null
  const [devotion, setDevotion] = useState<Devotion | null>(null)
  const [theme, setTheme] = useState<MonthTheme | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [marked, setMarked] = useState(false)
  const [marking, setMarking] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)
  const [hadStreak, setHadStreak] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(0)
  const [pickerDay, setPickerDay] = useState(0)

  const { month, day, year } = getTodayET()
  const todayStr = getETDateString()
  const yesterdayDate = new Date(year, month - 1, day - 1)
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`

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

        // Fetch devotion, theme, read status, bookmark status, and yesterday's read together
        const [{ data: dev }, { data: thm }, readRes, bmRes, yesterdayRes] = await Promise.all([
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
            .eq('month', month)
            .eq('day', day)
            .eq('year', year)
            .maybeSingle(),
          supabase
            .from('bookmarks')
            .select('month')
            .eq('user_id', user.id)
            .eq('month', month)
            .eq('day', day)
            .maybeSingle(),
          supabase
            .from('devotion_reads')
            .select('read_on')
            .eq('user_id', user.id)
            .eq('read_on', yesterdayStr)
            .limit(1)
            .maybeSingle(),
        ])
        setDevotion(dev)
        setTheme(thm)
        if (readRes.data?.read_on === todayStr) setMarked(true)
        if (bmRes.data) setBookmarked(true)
        if (yesterdayRes.data) setHadStreak(true)
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
      .upsert(
        { user_id: userId, month, day, year, read_on: todayStr },
        { onConflict: 'user_id,month,day,year' }
      )
    if (!error) {
      setMarked(true)
      router.refresh()
    }
    setMarking(false)
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 rounded-full bg-white/20 animate-pulse" />
        <div className="rounded-2xl min-h-[180px] bg-white/20 animate-pulse" />
        <div className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-4 animate-pulse">
          <div className="h-4 w-1/3 rounded bg-steel/10" />
          <div className="h-6 w-3/4 rounded bg-steel/10" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-steel/10" />
            <div className="h-3 w-full rounded bg-steel/10" />
            <div className="h-3 w-4/5 rounded bg-steel/10" />
          </div>
          <div className="h-10 w-36 rounded-xl bg-steel/10" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Back to group button — only shown when navigated from a group chat */}
      {fromGroupId && (
        <Link
          href={`/groups/${fromGroupId}`}
          className="inline-flex items-center gap-1 text-sm text-brand-blue hover:underline text-shadow-hero"
        >
          ← Back to Group
        </Link>
      )}

      {/* Date label — tappable to browse a different date */}
      <div>
        <button
          onClick={() => {
            setPickerMonth(month)
            setPickerDay(day)
            setShowDatePicker(true)
          }}
          className="rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-white hover:bg-white/30 transition-colors"
        >
          {dateLabel}
        </button>
      </div>

      {/* Date picker modal */}
      {showDatePicker && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/40 px-4"
          onClick={() => setShowDatePicker(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-steel/15 bg-white shadow-xl overflow-hidden p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-steel">Read a Different Day</p>
              <button
                onClick={() => setShowDatePicker(false)}
                className="text-muted hover:text-charcoal transition-colors"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <DevotionCalendar
              initialMonth={pickerMonth}
              initialDay={pickerDay}
              onSelect={(m, d) => {
                setShowDatePicker(false)
                router.push(`/devotion/${m}/${d}`)
              }}
            />
          </div>
        </div>
      )}

      {/* Month Theme Card */}
      {theme && (
        <AnimatedCard delay={0}>
        <div className="relative rounded-2xl overflow-hidden shadow-sm min-h-[180px]" style={{ willChange: 'transform' }}>
          <Image
            src={supabase.storage.from('themes').getPublicUrl(`month-${String(month).padStart(2, '0')}.jpg`).data.publicUrl}
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/65" />
          <div className="relative z-10 p-6">
            <p className="text-xs uppercase tracking-widest text-white mb-2">
              {theme.month_name} · Theme
            </p>
            <h2 className="text-lg font-semibold text-white mb-1">{theme.theme_title}</h2>
            <p className="text-sm text-white italic mb-3">{theme.theme_scripture_reference}</p>
            {theme.theme_scripture_text && (
              <p className="font-serif text-sm text-white border-l-2 border-white/40 pl-3 leading-relaxed">
                {theme.theme_scripture_text}
              </p>
            )}
          </div>
        </div>
        </AnimatedCard>
      )}

      {/* Devotion Card */}
      {devotion ? (
        <AnimatedCard delay={0.08}>
          <DevotionCard
            devotion={devotion}
            userId={userId}
            bookmarked={bookmarked}
            bookmarking={bookmarking}
            onBookmarkToggle={handleBookmarkToggle}
            marked={marked}
            marking={marking}
            onMarkRead={handleMarkRead}
            hadStreak={hadStreak}
          />
        </AnimatedCard>
      ) : (
        <AnimatedCard delay={0.08}>
          <div className="rounded-2xl border border-steel/20 bg-white p-10 text-center shadow-sm">
            <p className="text-muted text-sm">No devotion found for today.</p>
            <p className="text-muted text-xs mt-1">Check back soon or browse past devotions.</p>
          </div>
        </AnimatedCard>
      )}
    </div>
  )
}

export default function TodayPage() {
  return (
    <Suspense>
      <TodayPageInner />
    </Suspense>
  )
}
