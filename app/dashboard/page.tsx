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
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  const unique = Array.from(new Set(reads)).sort()
  const total = unique.length

  if (total === 0) return { current: 0, longest: 0, total: 0 }

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

const DEFAULT_ORDER = ['journey', 'today', 'author', 'quick-actions']
const STORAGE_KEY = 'dashboard_card_order'

// ---------------------------------------------------------------------------
// Drag handle icon
// ---------------------------------------------------------------------------

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="5" r="1.75" />
      <circle cx="15" cy="5" r="1.75" />
      <circle cx="9" cy="12" r="1.75" />
      <circle cx="15" cy="12" r="1.75" />
      <circle cx="9" cy="19" r="1.75" />
      <circle cx="15" cy="19" r="1.75" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Sortable card wrapper
// ---------------------------------------------------------------------------

function SortableCard({ id, dark, children }: { id: string; dark?: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50 z-50 relative' : ''}>
      <div className="relative">
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className={`absolute top-3 right-3 z-20 cursor-grab active:cursor-grabbing p-1.5 rounded-md transition-colors touch-none ${
            dark
              ? 'text-white/70 bg-black/25 hover:bg-black/40'
              : 'text-steel/60 bg-steel/10 hover:bg-steel/20'
          }`}
        >
          <GripIcon />
        </button>
        {children}
      </div>
    </div>
  )
}

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
  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_ORDER
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (
          Array.isArray(parsed) &&
          parsed.length === DEFAULT_ORDER.length &&
          DEFAULT_ORDER.every((id) => parsed.includes(id))
        ) {
          return parsed
        }
      }
    } catch {}
    return DEFAULT_ORDER
  })

  const { month, day, year } = getTodayET()
  const todayStr = `${year}-${pad(month)}-${pad(day)}`
  const yesterdayDate = new Date(year, month - 1, day - 1)
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${pad(yesterdayDate.getMonth() + 1)}-${pad(yesterdayDate.getDate())}`
  const dateLabel = `${MONTHS[month - 1]} ${day}, ${year}`

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setCardOrder((prev) => {
        const oldIndex = prev.indexOf(String(active.id))
        const newIndex = prev.indexOf(String(over.id))
        const next = arrayMove(prev, oldIndex, newIndex)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

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

  function renderCard(id: string) {
    switch (id) {
      case 'journey':
        return (
          <SortableCard key="journey" id="journey" dark>
            <div className="rounded-2xl p-5 shadow-sm space-y-4 bg-gradient-to-br from-[#1e3a52] to-steel">
              <h2 className="text-xs uppercase tracking-widest text-white/70 pr-6">Your Journey</h2>
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
          </SortableCard>
        )

      case 'today':
        return (
          <SortableCard key="today" id="today" dark>
            <div className="relative rounded-2xl overflow-hidden shadow-sm min-h-[180px]" style={{ willChange: 'transform' }}>
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
                    <span className="text-xs text-white/60 italic truncate pr-6">
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
          </SortableCard>
        )

      case 'author':
        return (
          <SortableCard key="author" id="author">
            <div className="rounded-2xl border border-steel/15 bg-canvas p-5 shadow-sm space-y-4">
              <div className="pr-6">
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
          </SortableCard>
        )

      case 'quick-actions':
        return (
          <SortableCard key="quick-actions" id="quick-actions">
            <div className="rounded-2xl border border-steel/15 bg-white shadow-sm overflow-hidden">
              <div className="px-4 pt-3 pb-3 pr-12">
                <h2 className="text-xs uppercase tracking-widest text-steel">Quick Actions</h2>
              </div>
              <div className="px-3 pb-3 grid grid-cols-4 gap-2">
                {QUICK_ACTIONS.map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-xl border border-steel/15 bg-canvas px-2 py-3 text-center text-xs font-medium text-charcoal hover:bg-canvas/80 transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </SortableCard>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4 pb-8">

      {/* Groups announcement modal */}
      {showGroupsAnnouncement && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/40 px-4">
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

      {/* Welcome card — pinned, not sortable */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-sm min-h-[100px]"
        style={{ willChange: 'transform' }}
      >
        <Image
          src={supabase.storage.from('themes').getPublicUrl('welcome-card.jpg').data.publicUrl}
          alt=""
          fill
          sizes="(max-width: 700px) 100vw, 700px"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-black/25" />
        <div className="relative z-10 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/80 mb-1">{dateLabel}</p>
            <h1 className="text-2xl font-semibold text-white">
              Welcome back{displayName ? `, ${displayName}` : ''}
            </h1>
          </div>
          <Avatar avatarUrl={avatarUrl} displayName={displayName} size="lg" />
        </div>
      </div>

      {/* Sortable cards */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cardOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {cardOrder.map((id) => renderCard(id))}
          </div>
        </SortableContext>
      </DndContext>

    </div>
  )
}
