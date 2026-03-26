'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin } from '@/lib/isAdmin'
import { getTodayET } from '@/lib/getTodayET'
import Image from 'next/image'
import MonthlyStreakGrid from '@/components/MonthlyStreakGrid'
import Avatar from '@/components/Avatar'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DevotionPreview = { title: string; verse_reference: string } | null
type MonthTheme = { theme_title: string; theme_scripture_reference: string } | null
type Streaks = { current: number; longest: number; total: number }
type AuthorUpdate = {
  id: string
  title: string
  body: string
  published_at: string | null
  created_at: string
}

function updatePreview(body: string, max = 150): string {
  const clean = body.replace(/\n+/g, ' ').trim()
  return clean.length > max ? clean.slice(0, max).trimEnd() + '…' : clean
}

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
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [devotion, setDevotion] = useState<DevotionPreview>(null)
  const [theme, setTheme] = useState<MonthTheme>(null)
  const [streaks, setStreaks] = useState<Streaks>({ current: 0, longest: 0, total: 0 })
  const [readDates, setReadDates] = useState<string[]>([])
  const [updates, setUpdates] = useState<AuthorUpdate[]>([])
  const [showGroupsAnnouncement, setShowGroupsAnnouncement] = useState(false)

  const { month, day, year } = getTodayET()
  const todayStr = `${year}-${pad(month)}-${pad(day)}`
  const yesterdayDate = new Date(year, month - 1, day - 1)
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${pad(yesterdayDate.getMonth() + 1)}-${pad(yesterdayDate.getDate())}`
  const dateLabel = `${MONTHS[month - 1]} ${day}, ${year}`

  useEffect(() => {
    async function init() {
      try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Welcome gate: redirect first-time users before showing the dashboard
      const { data: flags } = await supabase
        .from('user_flags')
        .select('has_seen_welcome, groups_announcement_count')
        .eq('user_id', user.id)
        .single()
      if (!flags || !flags.has_seen_welcome) {
        router.push('/welcome')
        return
      }

      const announcementCount = flags.groups_announcement_count ?? 0
      const sessionKey = 'groups_announcement_shown'
      if (announcementCount < 3 && !sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, '1')
        setShowGroupsAnnouncement(true)
        supabase
          .from('user_flags')
          .update({ groups_announcement_count: announcementCount + 1 })
          .eq('user_id', user.id)
          .then(() => {})
      }

      const [devotionRes, themeRes, readsRes, adminResult, profileRes] = await Promise.all([
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
        isAdmin(),
        supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single(),
      ])

      if (devotionRes.data) setDevotion(devotionRes.data)
      if (themeRes.data) setTheme(themeRes.data)
      if (profileRes.data?.display_name) setDisplayName(profileRes.data.display_name)
      if (profileRes.data?.avatar_url) setAvatarUrl(profileRes.data.avatar_url)
      if (readsRes.data) {
        const dates = readsRes.data.map((r: { read_on: string }) => r.read_on)
        setReadDates(dates)
        setStreaks(computeStreaks(dates, todayStr, yesterdayStr))
      }

      // Fetch author updates (admin sees all, others see published only)
      let updatesQuery = supabase
        .from('author_updates')
        .select('id, title, body, published_at, created_at')
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(3)
      if (!adminResult) updatesQuery = updatesQuery.eq('published', true)
      const updatesRes = await updatesQuery
      if (updatesRes.data) setUpdates(updatesRes.data)
      } catch {
        // fall through and show whatever loaded
      } finally {
        setReady(true)
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

      {/* Groups feature announcement modal */}
      {showGroupsAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-steel/15 bg-white shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="pt-8 px-6 pb-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <p className="text-xs uppercase tracking-widest text-steel mb-1">Something New Is Here</p>
                <h2 className="text-lg font-semibold text-charcoal">Small Groups</h2>
              </div>
              <div className="font-serif text-[15px] text-charcoal leading-[1.85] space-y-3">
                <p>One of the things I&apos;ve learned in recovery is that we were never meant to do this alone.</p>
                <p>That&apos;s why I&apos;m excited to share something new with you — <span className="font-semibold not-italic">Small Groups</span>.</p>
                <p>You can now create or join a small group right here in the app. Each day, your group will have a space to reflect together on that day&apos;s devotion. To ask questions. To share what&apos;s stirring. To remind each other that someone else is in it with you.</p>
                <p>The opposite of addiction is connection — and this is one more way to build it.</p>
                <p>To get started, tap the <span className="font-semibold not-italic">Groups</span> tab in the navigation.</p>
                <p>I&apos;m glad you&apos;re here. Now let&apos;s do this together.</p>
                <p className="text-muted text-sm">— George</p>
              </div>
            </div>
            <div className="border-t border-steel/10 p-4 flex flex-col gap-2">
              <Link
                href="/groups"
                onClick={() => setShowGroupsAnnouncement(false)}
                className="block w-full rounded-xl bg-steel px-4 py-3 text-center text-sm font-medium text-white hover:bg-steel/90 transition-colors"
              >
                Take me to Groups
              </Link>
              <button
                onClick={() => setShowGroupsAnnouncement(false)}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-muted hover:text-charcoal transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome card */}
      <div className="relative rounded-2xl overflow-hidden shadow-sm">
        <Image
          src={supabase.storage.from('themes').getPublicUrl('welcome-card.jpg').data.publicUrl}
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="relative z-10 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white mb-1 text-shadow-strong">{dateLabel}</p>
            <h1 className="text-2xl font-semibold text-white text-shadow-strong">
              Welcome back{displayName ? `, ${displayName}` : ''}
            </h1>
          </div>
          <Avatar avatarUrl={avatarUrl} displayName={displayName} size="md" />
        </div>
      </div>

      {/* Journey card */}
      <div className="rounded-2xl p-5 shadow-sm space-y-4 bg-gradient-to-br from-[#1e3a52] to-steel">
        <h2 className="text-xs uppercase tracking-widest text-white/70">Your Journey</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Current Streak', value: `${streaks.current}d` },
            { label: 'Longest Streak', value: `${streaks.longest}d` },
            { label: 'Days Read',      value: String(streaks.total) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl bg-white/10 border border-white/15 p-3 text-center"
            >
              <p className="text-xl font-semibold text-white tabular-nums">{value}</p>
              <p className="text-[11px] text-white/60 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-white/15 pt-4">
          <MonthlyStreakGrid
            currentMonth={month}
            currentYear={year}
            readDates={readDates}
            variant="dark"
          />
        </div>
      </div>

      {/* Today card */}
      <div className="relative rounded-2xl overflow-hidden shadow-sm min-h-[180px]">
        <Image
          src={supabase.storage.from('themes').getPublicUrl(`month-${String(month).padStart(2, '0')}.jpg`).data.publicUrl}
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/75" />
        <div className="relative z-10 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs uppercase tracking-widest text-white/70">Today</h2>
            {theme && (
              <span className="text-xs text-white/60 italic truncate">
                {theme.theme_scripture_reference}
              </span>
            )}
          </div>

          {theme && (
            <p className="text-xs font-medium text-white/80">{theme.theme_title}</p>
          )}

          {devotion ? (
            <>
              <div>
                <p className="text-base font-semibold text-white">{devotion.title}</p>
                <p className="text-sm text-white/70 mt-0.5">{devotion.verse_reference}</p>
              </div>
              <Link
                href="/today"
                className="block w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
              >
                Continue Reading →
              </Link>
            </>
          ) : (
            <p className="text-sm text-white/70">No devotion for today yet.</p>
          )}
        </div>
      </div>

      {/* From the Author card */}
      <div className="rounded-2xl border border-steel/15 bg-canvas p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-xs uppercase tracking-widest text-steel">From the Author</h2>
          <p className="text-xs text-muted mt-0.5">New reflections and recent messages.</p>
        </div>

        {updates.length === 0 ? (
          <p className="text-sm text-muted">No messages yet.</p>
        ) : (
          <ul className="space-y-4">
            {updates.map((u) => (
              <li key={u.id} className="border-t border-steel/10 pt-4 first:border-0 first:pt-0">
                <p className="text-base font-semibold text-charcoal">{u.title}</p>
                <p className="text-xs text-muted mt-0.5">
                  {new Date(u.published_at ?? u.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
                <p className="text-sm text-charcoal/70 mt-1 leading-relaxed">
                  {updatePreview(u.body)}
                </p>
                <Link
                  href={`/updates/${u.id}`}
                  className="inline-block mt-2 text-xs font-medium text-steel hover:underline"
                >
                  Read more →
                </Link>
              </li>
            ))}
          </ul>
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
