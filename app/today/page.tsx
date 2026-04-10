'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function daysInMonth(m: number) {
  return new Date(2024, m, 0).getDate()
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
            .select('month')
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
            .maybeSingle(),
        ])
        setDevotion(dev)
        setTheme(thm)
        if (readRes.data) setMarked(true)
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
      .insert({ user_id: userId, month, day, year, read_on: todayStr })
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
            className="w-full max-w-sm rounded-2xl border border-steel/15 bg-white shadow-xl overflow-hidden space-y-5 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-steel mb-0.5">Read a Different Day</p>
              <p className="text-sm text-muted">Select a month and day to navigate to that devotion.</p>
            </div>

            <div className="space-y-4">
              {/* Month */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-steel mb-2">Month</label>
                <select
                  value={pickerMonth}
                  onChange={(e) => {
                    const m = Number(e.target.value)
                    setPickerMonth(m)
                    const max = daysInMonth(m)
                    if (pickerDay > max) setPickerDay(max)
                  }}
                  className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-base text-charcoal focus:outline-none focus:ring-2 focus:ring-steel/30"
                >
                  {MONTHS.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Day */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-steel mb-2">Day</label>
                <select
                  value={pickerDay}
                  onChange={(e) => setPickerDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-base text-charcoal focus:outline-none focus:ring-2 focus:ring-steel/30"
                >
                  {Array.from({ length: daysInMonth(pickerMonth) }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDatePicker(false)}
                className="flex-1 rounded-xl border border-steel/20 px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-canvas transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDatePicker(false)
                  router.push(`/devotion/${pickerMonth}/${pickerDay}`)
                }}
                className="flex-1 rounded-xl bg-steel px-4 py-2.5 text-sm font-medium text-white hover:bg-steel/90 transition-colors"
              >
                Read Devotion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Month Theme Card */}
      {theme && (
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
          hadStreak={hadStreak}
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

export default function TodayPage() {
  return (
    <Suspense>
      <TodayPageInner />
    </Suspense>
  )
}
