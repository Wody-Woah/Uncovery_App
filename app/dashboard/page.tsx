'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getTodayET } from '@/lib/getTodayET'
import Image from 'next/image'
import MonthlyStreakGrid from '@/components/MonthlyStreakGrid'
import Avatar from '@/components/Avatar'
import AnimatedCard from '@/components/AnimatedCard'
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

function computeDaysClean(cleanDateStr: string): number {
  const clean = new Date(cleanDateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - clean.getTime()) / (1000 * 60 * 60 * 24))
}

function computeBreakdown(cleanDateStr: string): { years: number; months: number; days: number } {
  const clean = new Date(cleanDateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let years = today.getFullYear() - clean.getFullYear()
  let months = today.getMonth() - clean.getMonth()
  let days = today.getDate() - clean.getDate()
  if (days < 0) {
    months--
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate()
  }
  if (months < 0) { years--; months += 12 }
  return { years, months, days }
}

function getAnniversaryYears(cleanDateStr: string): number | null {
  const clean = new Date(cleanDateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (today.getMonth() === clean.getMonth() && today.getDate() === clean.getDate()) {
    const years = today.getFullYear() - clean.getFullYear()
    return years > 0 ? years : null
  }
  return null
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function computeStreaks(reads: string[], todayStr: string, yesterdayStr: string, totalDevotions: number): Streaks {
  const unique = Array.from(new Set(reads)).sort()
  const total = totalDevotions

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

const STREAK_MILESTONES = [
  {
    days: 1,
    title: 'Awakened',
    message: 'Something has begun.',
    scripture: '"Wake up, sleeper, rise from the dead, and Christ will shine on you."',
    reference: 'Ephesians 5:14',
    congratulations: "I'm proud of you for showing up—this is where everything starts.",
  },
  {
    days: 7,
    title: 'Turning Toward the Light',
    message: "You're not who you were.",
    scripture: '"The path of the righteous is like the morning sun, shining ever brighter till the full light of day."',
    reference: 'Proverbs 4:18',
    congratulations: "You stayed with it this week—and that's no small thing.",
  },
  {
    days: 14,
    title: 'Returning',
    message: 'Every morning, you come back. That\'s how transformation happens.',
    scripture: '"His mercies are new every morning; great is your faithfulness."',
    reference: 'Lamentations 3:23',
    congratulations: "Two weeks in—this is more than a streak. It's a practice.",
  },
  {
    days: 30,
    title: 'Planted',
    message: 'Stay where growth can happen.',
    scripture: '"Blessed is the one… whose roots go down deep into the water."',
    reference: 'Jeremiah 17:7–8',
    congratulations: "A month in—you're not just trying anymore, you're becoming.",
  },
  {
    days: 60,
    title: 'Being Formed',
    message: "God is doing more than you can see.",
    scripture: '"We are the clay, you are the potter; we are all the work of your hand."',
    reference: 'Isaiah 64:8',
    congratulations: "You've stayed through the process—even when it's not easy to see.",
  },
  {
    days: 90,
    title: 'Renewed Mind',
    message: 'Truth is taking root.',
    scripture: '"Be transformed by the renewing of your mind."',
    reference: 'Romans 12:2',
    congratulations: "You're thinking differently now—and that changes everything.",
  },
  {
    days: 180,
    title: 'Established',
    message: 'You are not easily shaken anymore.',
    scripture: '"Continue to live your lives in him, rooted and built up in him, strengthened in the faith."',
    reference: 'Colossians 2:6–7',
    congratulations: "Six months in—you're stronger than you realize.",
  },
  {
    days: 365,
    title: 'Transformed',
    message: 'Christ in you is being revealed.',
    scripture: '"If anyone is in Christ, the new creation has come."',
    reference: '2 Corinthians 5:17',
    congratulations: "A year later—this is real transformation, and you're living it.",
  },
] as const

type Milestone = typeof STREAK_MILESTONES[number]

const MILESTONE_STORAGE_KEY = 'shown_streak_milestones'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DEFAULT_ORDER = ['journey', 'clean-date', 'today', 'author']
const STORAGE_KEY = 'dashboard_card_order'
const DRAG_HINT_KEY = 'dashboard_drag_hint_seen'

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

function SortableCard({ id, index = 0, dark, showHint, children }: { id: string; index?: number; dark?: boolean; showHint?: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50 z-50 relative' : ''}>
      <AnimatedCard delay={index * 0.08}>
        <div className="relative">
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            {showHint && (
              <span className={`text-[11px] font-medium rounded-md px-2 py-1 ${
                dark ? 'bg-black/30 text-white/70' : 'bg-steel/10 text-steel/70'
              }`}>
                Drag to reorder
              </span>
            )}
            <button
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder"
              className={`cursor-grab active:cursor-grabbing p-1.5 rounded-md transition-colors touch-none ${
                dark
                  ? 'text-white/70 bg-black/25 hover:bg-black/40'
                  : 'text-steel/60 bg-steel/10 hover:bg-steel/20'
              }`}
            >
              <GripIcon />
            </button>
          </div>
          {children}
        </div>
      </AnimatedCard>
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
  const [readUpdateIds, setReadUpdateIds] = useState<Set<string>>(new Set())
  const [showGroupsAnnouncement, setShowGroupsAnnouncement] = useState(false)
  const [cleanDate, setCleanDate] = useState<string | null>(null)
  const [showCleanDateCard, setShowCleanDateCard] = useState(false)
  const [showJourneyCard, setShowJourneyCard] = useState(true)
  const [cleanDateView, setCleanDateView] = useState<'days' | 'breakdown'>('days')
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null)
  const [totalPublishedDevotions, setTotalPublishedDevotions] = useState(0)
  const [thisYearReadCount, setThisYearReadCount] = useState(0)
  const swipeStartX = useRef<number | null>(null)

  const [searchQuery, setSearchQuery] = useState('')

  const [showDragHint, setShowDragHint] = useState(() =>
    typeof window !== 'undefined' ? !localStorage.getItem(DRAG_HINT_KEY) : false
  )

  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_ORDER
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          // Keep saved order, add any new cards not yet present
          const merged = parsed.filter((id: string) => DEFAULT_ORDER.includes(id))
          DEFAULT_ORDER.forEach((id) => { if (!merged.includes(id)) merged.push(id) })
          return merged
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
    if (showDragHint) {
      setShowDragHint(false)
      localStorage.setItem(DRAG_HINT_KEY, '1')
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('read_update_ids')
    if (stored) setReadUpdateIds(new Set(JSON.parse(stored)))
  }, [])

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

        const [devotionRes, themeRes, readsRes, readsCountRes, profileRes, totalDevotionsRes] = await Promise.all([
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
            .limit(400),
          supabase
            .from('devotion_reads')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('profiles')
            .select('display_name, avatar_url, clean_date, show_clean_date_card, show_journey_card')
            .eq('id', user.id)
            .single(),
          supabase
            .from('devotions')
            .select('*', { count: 'exact', head: true })
            .eq('published', true),
        ])

        if (devotionRes.data) setDevotion(devotionRes.data)
        if (themeRes.data) setTheme(themeRes.data)
        if (profileRes.data?.display_name) setDisplayName(profileRes.data.display_name)
        if (profileRes.data?.avatar_url) setAvatarUrl(profileRes.data.avatar_url)
        if (profileRes.data?.clean_date) setCleanDate(profileRes.data.clean_date)
        if (profileRes.data?.show_clean_date_card) setShowCleanDateCard(profileRes.data.show_clean_date_card)
        setShowJourneyCard(profileRes.data?.show_journey_card ?? true)
        const dates = (readsRes.data ?? []).map((r: { read_on: string }) => r.read_on)
        setReadDates(dates)
        const computed = computeStreaks(dates, todayStr, yesterdayStr, readsCountRes.count ?? dates.length)
        setStreaks(computed)
        setTotalPublishedDevotions(totalDevotionsRes.count ?? 0)
        setThisYearReadCount(dates.filter(d => d.startsWith(`${year}-`)).length)

        const shownRaw = localStorage.getItem(MILESTONE_STORAGE_KEY)
        const shown: number[] = shownRaw ? JSON.parse(shownRaw) : []
        const hit = STREAK_MILESTONES.find(m => m.days === computed.current && !shown.includes(m.days))
        if (hit) setActiveMilestone(hit)

        let updatesQuery = supabase
          .from('author_updates')
          .select('id, title, body, published_at, created_at')
          .order('pinned', { ascending: false })
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(3)
        updatesQuery = updatesQuery.eq('published', true)
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
    return (
      <div className="-mt-[22px] space-y-4">
        <div className="fixed inset-0 -z-[5] bg-[#162845]" />
        <div className="rounded-2xl min-h-[180px] bg-white/10 animate-pulse" />
        <div className="rounded-2xl border border-white/10 bg-white/8 p-5 space-y-3 animate-pulse">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="h-5 w-3/4 rounded bg-white/10" />
          <div className="h-3 w-2/5 rounded bg-white/10" />
          <div className="h-10 w-32 rounded-xl bg-white/10" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/8 p-5 space-y-3 animate-pulse">
          <div className="h-3 w-20 rounded bg-white/10" />
          <div className="flex gap-4 justify-center py-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-8 w-12 rounded bg-white/10" />
                <div className="h-2 w-10 rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/8 p-5 space-y-3 animate-pulse">
          <div className="h-3 w-28 rounded bg-white/10" />
          <div className="h-3 w-full rounded bg-white/10" />
          <div className="h-3 w-4/5 rounded bg-white/10" />
        </div>
      </div>
    )
  }

  function dismissMilestone() {
    if (!activeMilestone) return
    const shownRaw = localStorage.getItem(MILESTONE_STORAGE_KEY)
    const shown: number[] = shownRaw ? JSON.parse(shownRaw) : []
    localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify([...shown, activeMilestone.days]))
    setActiveMilestone(null)
  }

  const activeCardOrder = cardOrder.filter((id) => {
    if (id === 'journey') return showJourneyCard
    if (id === 'clean-date') return showCleanDateCard && !!cleanDate
    return true
  })

  function renderCard(id: string, index: number) {
    const isFirst = index === 0
    switch (id) {
      case 'clean-date': {
        if (!cleanDate) return null
        const daysClean = computeDaysClean(cleanDate)
        const breakdown = computeBreakdown(cleanDate)
        const anniversary = getAnniversaryYears(cleanDate)
        const cleanDateObj = new Date(cleanDate + 'T00:00:00')
        const cleanMonth = cleanDateObj.getMonth() + 1
        const imageMonth = cleanMonth === month ? (month === 1 ? 12 : month - 1) : cleanMonth
        const imageUrl = supabase.storage.from('themes').getPublicUrl(`month-${String(imageMonth).padStart(2, '0')}.jpg`).data.publicUrl
        const sinceLabel = cleanDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        return (
          <SortableCard key="clean-date" id="clean-date" index={index} dark showHint={isFirst && showDragHint}>
            <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.8)] min-h-[180px]" style={{ willChange: 'transform' }}>
              <Image src={imageUrl} alt="" fill className="object-cover" priority />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/55" />
              <div
                className="relative z-10 p-5 space-y-3 text-center"
                onTouchStart={(e) => { swipeStartX.current = e.touches[0].clientX }}
                onTouchEnd={(e) => {
                  if (swipeStartX.current === null) return
                  const diff = swipeStartX.current - e.changedTouches[0].clientX
                  if (diff > 50) setCleanDateView('breakdown')
                  else if (diff < -50) setCleanDateView('days')
                  swipeStartX.current = null
                }}
              >
                {anniversary !== null && (
                  <div className="rounded-xl bg-white/20 border border-white/30 px-4 py-2.5 backdrop-blur-sm">
                    <p className="text-xs font-semibold text-white leading-snug">
                      Today marks your {ordinal(anniversary)} year of freedom — we are so proud of you.
                    </p>
                  </div>
                )}

                {cleanDateView === 'days' ? (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/70">Days Clean</p>
                    <p className="text-5xl font-bold text-white tabular-nums mt-1">{daysClean.toLocaleString()}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-4">
                    {[
                      { value: breakdown.years,  label: breakdown.years  === 1 ? 'Year'  : 'Years'  },
                      { value: breakdown.months, label: breakdown.months === 1 ? 'Month' : 'Months' },
                      { value: breakdown.days,   label: breakdown.days   === 1 ? 'Day'   : 'Days'   },
                    ].map(({ value, label }) => (
                      <div key={label} className="flex flex-col items-center">
                        <p className="text-4xl font-bold text-white tabular-nums">{value}</p>
                        <p className="text-xs text-white/70 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-sm text-white/70">Since {sinceLabel}</p>

                {/* View toggle arrows */}
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    onClick={() => setCleanDateView('days')}
                    className={`w-2 h-2 rounded-full transition-colors ${cleanDateView === 'days' ? 'bg-white' : 'bg-white/30'}`}
                  />
                  <button
                    onClick={() => setCleanDateView('breakdown')}
                    className={`w-2 h-2 rounded-full transition-colors ${cleanDateView === 'breakdown' ? 'bg-white' : 'bg-white/30'}`}
                  />
                </div>
              </div>
            </div>
          </SortableCard>
        )
      }

      case 'journey':
        return (
          <SortableCard key="journey" id="journey" index={index} dark showHint={isFirst && showDragHint}>
            <div className="rounded-2xl p-5 ring-1 ring-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.8)] space-y-4 bg-gradient-to-br from-[#1e3a52] to-steel">
              <h2 className="text-xs uppercase tracking-widest text-white/70 pr-6">Your Journey</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Current Streak', value: `${streaks.current}d` },
                  { label: 'Longest Streak', value: `${streaks.longest}d` },
                  { label: 'Days Read',      value: String(streaks.total) },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl bg-white/15 border border-white/20 p-3 text-center"
                  >
                    <p className="text-xl font-semibold text-white tabular-nums">{value}</p>
                    <p className="text-[11px] text-white/60 mt-0.5 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
              {!readDates.includes(todayStr) && (
                <p className="text-center text-[11px] text-white/45 leading-snug -mt-1">
                  Scroll to the end of today&apos;s devotion to count it toward your streak.
                </p>
              )}
              {totalPublishedDevotions > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-white/60">
                      {thisYearReadCount} of {totalPublishedDevotions} devotions read this year
                    </p>
                    <p className="text-[11px] text-white/60 tabular-nums">
                      {Math.round((thisYearReadCount / totalPublishedDevotions) * 100)}%
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/60 transition-all duration-500"
                      style={{ width: `${Math.min((thisYearReadCount / totalPublishedDevotions) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
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
          <SortableCard key="today" id="today" index={index} dark showHint={isFirst && showDragHint}>
            <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.8)] min-h-[180px]" style={{ willChange: 'transform' }}>
              <Image
                src={supabase.storage.from('themes').getPublicUrl(`month-${String(month).padStart(2, '0')}.jpg`).data.publicUrl}
                alt=""
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/15 to-black/55" />
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
          <SortableCard key="author" id="author" index={index} dark showHint={isFirst && showDragHint}>
            <div className="rounded-2xl border border-white/25 ring-1 ring-white/10 bg-white/8 backdrop-blur-sm p-5 space-y-4">
              <div className="pr-6">
                <h2 className="text-xs uppercase tracking-widest text-white/75">From the Author</h2>
                <p className="text-xs text-white/60 mt-0.5">New reflections and recent messages.</p>
              </div>
              {updates.length === 0 ? (
                <p className="text-sm text-white/65">No messages yet.</p>
              ) : (
                <ul className="space-y-4">
                  {updates.map((u) => (
                    <li key={u.id} className="border-t border-white/10 pt-4 first:border-0 first:pt-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-semibold text-white">{u.title}</p>
                        {!readUpdateIds.has(u.id) && (
                          <span className="rounded-full bg-green-500/20 border border-green-400/30 px-2 py-0.5 text-[10px] font-semibold text-green-300 uppercase tracking-wide">New Post</span>
                        )}
                      </div>
                      <p className="text-xs text-white/60 mt-0.5">
                        {new Date(u.published_at ?? u.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-white/65 mt-1 leading-relaxed">
                        {updatePreview(u.body)}
                      </p>
                      <Link
                        href={`/updates/${u.id}`}
                        className="inline-block mt-2 text-xs font-medium text-white/70 hover:text-white transition-colors"
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

      default:
        return null
    }
  }

  return (
    <div className="-mt-[22px] space-y-4 pb-8">
      {/* Dark navy background — covers the shared login-hero.jpg on this page only */}
      <div className="fixed inset-0 -z-[5] bg-[#162845]" />

      {/* Streak milestone celebration overlay */}
      {activeMilestone && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
            {/* Header band */}
            <div className="bg-gradient-to-br from-[#1e3a52] to-[#2a5280] px-6 pt-8 pb-6 text-center space-y-1">
              <div className="flex items-center justify-center mb-3">
                <span className="rounded-full border border-yellow-300/40 bg-yellow-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-yellow-200">
                  {activeMilestone.days === 180 ? '6-Month' : activeMilestone.days === 365 ? '1-Year' : `${activeMilestone.days}-Day`} Streak
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold text-white">{activeMilestone.title}</h2>
              <p className="text-sm text-white/70">{activeMilestone.message}</p>
            </div>

            {/* Body */}
            <div className="bg-white px-6 py-6 space-y-5">
              <blockquote className="space-y-1 text-center">
                <p className="font-serif text-[15px] text-charcoal leading-relaxed italic">{activeMilestone.scripture}</p>
                <p className="text-xs font-semibold uppercase tracking-widest text-steel">{activeMilestone.reference}</p>
              </blockquote>

              <div className="rounded-xl bg-canvas border border-steel/15 px-4 py-3 text-center">
                <p className="text-sm text-charcoal leading-relaxed">{activeMilestone.congratulations}</p>
              </div>

              <button
                onClick={dismissMilestone}
                className="w-full rounded-xl bg-steel px-4 py-3 text-sm font-medium text-white hover:bg-steel/90 transition-colors"
              >
                Keep Going →
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Profile nudge — shown when user has no avatar */}
      {!avatarUrl && (
        <div className="rounded-2xl border border-white/15 bg-white/8 backdrop-blur-sm p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Personalize your profile</p>
              <p className="text-xs text-white/60 mt-0.5">Add a photo and display name so your group members can recognize you.</p>
            </div>
          </div>
          <Link
            href="/profile"
            className="block w-full rounded-xl bg-white/20 border border-white/25 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
          >
            Set Up Profile
          </Link>
        </div>
      )}

      {/* Welcome card — pinned, not sortable */}
      <div
        className="relative rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.8)] min-h-[100px]"
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
        <div className="absolute inset-0 bg-gradient-to-br from-black/35 to-black/10" />
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

      {/* Search bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          router.push(searchQuery.trim().length >= 2 ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : '/search')
        }}
      >
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search devotions by keyword…"
            className="w-full rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
      </form>

      {/* Sortable cards */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={activeCardOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {activeCardOrder.map((id, index) => renderCard(id, index))}
          </div>
        </SortableContext>
      </DndContext>

    </div>
  )
}
