'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import AnimatedCard from '@/components/AnimatedCard'

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type BookmarkCard = {
  month: number
  day: number
  created_at: string
  title: string
  verse_reference: string
}

export default function BookmarksPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [bookmarks, setBookmarks] = useState<BookmarkCard[]>([])

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Fetch bookmarks ordered by most recent
      const { data: bms } = await supabase
        .from('bookmarks')
        .select('month, day, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!bms || bms.length === 0) {
        setReady(true)
        return
      }

      // Fetch all bookmarked devotions in one query using composite OR filter
      const filter = bms
        .map((b) => `and(month.eq.${b.month},day.eq.${b.day})`)
        .join(',')
      const { data: devs } = await supabase
        .from('devotions')
        .select('month, day, title, verse_reference')
        .or(filter)

      const devMap = new Map(
        (devs ?? []).map((d) => [`${d.month}-${d.day}`, d])
      )

      setBookmarks(
        bms.map((b) => ({
          ...b,
          title: devMap.get(`${b.month}-${b.day}`)?.title ?? '',
          verse_reference: devMap.get(`${b.month}-${b.day}`)?.verse_reference ?? '',
        }))
      )
      setReady(true)
    }

    init()
  }, [router])

  if (!ready) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-brand-blue text-shadow-hero text-center">Bookmarks</h1>
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm flex items-center justify-between gap-4 animate-pulse"
            >
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="h-3 w-24 bg-steel/15 rounded" />
                <div className="h-4 w-3/4 bg-steel/20 rounded" />
                <div className="h-3 w-1/2 bg-steel/15 rounded" />
              </div>
              <div className="shrink-0 h-7 w-14 bg-steel/15 rounded-lg" />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-blue text-shadow-hero text-center">Bookmarks</h1>

      {bookmarks.length === 0 ? (
        <AnimatedCard>
          <div className="rounded-2xl border border-steel/20 bg-white p-8 text-center shadow-sm space-y-3">
            <div className="flex justify-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-steel/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-steel">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-charcoal font-semibold text-sm">Nothing saved yet</p>
              <p className="text-muted text-sm mt-1 leading-relaxed">
                When a devotion resonates with you, tap the bookmark icon while reading to save it here.
              </p>
            </div>
          </div>
        </AnimatedCard>
      ) : (
        <ul className="space-y-3">
          {bookmarks.map((b, index) => (
            <li key={`${b.month}-${b.day}`}>
              <AnimatedCard delay={index * 0.06}>
                <div className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-steel mb-1">
                      {MONTHS[b.month]} {b.day}
                    </p>
                    <p className="text-base font-semibold text-charcoal truncate">{b.title}</p>
                    <p className="text-sm text-muted mt-0.5 truncate">{b.verse_reference}</p>
                  </div>
                  <Link
                    href={`/devotion/${b.month}/${b.day}`}
                    className="shrink-0 rounded-lg border border-steel/20 px-3 py-1.5 text-sm font-medium text-steel hover:bg-canvas transition-colors"
                  >
                    Open
                  </Link>
                </div>
              </AnimatedCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
