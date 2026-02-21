'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getTodayET } from '@/lib/getTodayET'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DevotionPreview = { title: string; verse_reference: string } | null
type MonthTheme = { theme_title: string; theme_scripture_reference: string } | null
type Streaks = { current: number; longest: number; total: number }

// ---------------------------------------------------------------------------
// Streak helpers
// ---------------------------------------------------------------------------

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function computeStreaks(reads: string[], todayStr: string, yesterdayStr: string): Streaks {
  const unique = Array.from(new Set(reads)).sort() // ascending YYYY-MM-DD strings
  const total = unique.length

  if (total === 0) return { current: 0, longest: 0, total: 0 }

  // Longest streak
  let longest = 1
  let run = 1
  for (let i = 1; i < unique.length; i++) {
    const diff =
      (new Date(unique[i]).getTime() - new Date(unique[i - 1]).getTime()) / 86_400_000
    if (diff === 1) {
      run++
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }

  // Current streak: only valid if last read is today or yesterday
  const last = unique[unique.length - 1]
  if (last !== todayStr && last !== yesterdayStr) {
    return { current: 0, longest, total }
  }

  let current = 1
  for (let i = unique.length - 2; i >= 0; i--) {
    const diff =
      (new Date(unique[i + 1]).getTime() - new Date(unique[i]).getTime()) / 86_400_000
    if (diff === 1) current++
    else break
  }

  return { current, longest, total }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const QUICK_ACTIONS = [
  { label: 'Today',     href: '/today' },
  { label: 'Browse',    href: '/browse' },
  { label: 'Bookmarks', href: '/bookmarks' },
  { label: 'Journal',   href: '/journal' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [devotion, setDevotion] = useState<DevotionPreview>(null)
  const [theme, setTheme] = useState<MonthTheme>(null)
  const [streaks, setStreaks] = useState<Streaks>({ current: 0, longest: 0, total: 0 })

  const { month, day, year } = getTodayET()
  const todayStr = `${year}-${pad(month)}-${pad(day)}`
  const yesterdayDate = new Date(year, month - 1, day - 1)
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${pad(yesterdayDate.getMonth() + 1)}-${pad(yesterdayDate.getDate())}`
  const dateLabel = `${MONTHS[month - 1]} ${day}, ${year}`

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setReady(true)

      const [devotionRes, themeRes, readsRes] = await Promise.all([
        supabase
          .from('devotions')
          .select('title, verse_reference')
          .eq('month', month)
          .eq('day', day)
          .eq('published', true)
          .single(),
        supabase
          .from('month_themes')
          .select('theme_title, theme_scripture_reference')
          .eq('month', month)
          .single(),
        supabase
          .from('devotion_reads')
          .select('read_on')
          .eq('user_id', user.id)
          .order('read_on', { ascending: false })
          .limit(60),
      ])

      if (devotionRes.data) setDevotion(devotionRes.data)
      if (themeRes.data) setTheme(themeRes.data)
      if (readsRes.data) {
        const dates = readsRes.data.map((r: { read_on: string }) => r.read_on)
        setStreaks(computeStreaks(dates, todayStr, yesterdayStr))
      }
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!ready) {
    return <div className="py-20 text-center text-muted text-sm">Loading…</div>
  }

  return (
    <div className="space-y-4 pb-8">

      {/* Welcome card */}
      <div className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-widest text-steel mb-1">{dateLabel}</p>
        <h1 className="text-2xl font-semibold text-charcoal">Welcome back</h1>
      </div>

      {/* Journey card */}
      <div className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-steel">Your Journey</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Current Streak', value: `${streaks.current}d` },
            { label: 'Longest Streak', value: `${streaks.longest}d` },
            { label: 'Days Read',      value: String(streaks.total) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl bg-canvas border border-steel/10 p-3 text-center"
            >
              <p className="text-xl font-semibold text-charcoal tabular-nums">{value}</p>
              <p className="text-[11px] text-muted mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Today card */}
      <div className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs uppercase tracking-widest text-steel">Today</h2>
          {theme && (
            <span className="text-xs text-muted italic truncate">
              {theme.theme_scripture_reference}
            </span>
          )}
        </div>

        {theme && (
          <p className="text-xs font-medium text-steel/80">{theme.theme_title}</p>
        )}

        {devotion ? (
          <>
            <div>
              <p className="text-base font-semibold text-charcoal">{devotion.title}</p>
              <p className="text-sm text-muted mt-0.5">{devotion.verse_reference}</p>
            </div>
            <Link
              href="/today"
              className="block w-full rounded-xl bg-steel px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-steel/90 transition-colors"
            >
              Continue Reading →
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted">No devotion for today yet.</p>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl border border-steel/15 bg-white px-2 py-3 text-center text-xs font-medium text-charcoal hover:bg-canvas transition-colors shadow-sm"
          >
            {label}
          </Link>
        ))}
      </div>

    </div>
  )
}
