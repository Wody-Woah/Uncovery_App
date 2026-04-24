'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import AnimatedCard from '@/components/AnimatedCard'

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Result = {
  month: number
  day: number
  title: string
  verse_reference: string
  body: string
}

function snippet(text: string, max = 120): string {
  const clean = text.replace(/\n+/g, ' ').trim()
  return clean.length > max ? clean.slice(0, max).trimEnd() + '…' : clean
}

function SearchPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ready, setReady] = useState(false)
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [results, setResults] = useState<Result[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setReady(true)
    })
  }, [router])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    const timer = setTimeout(async () => {
      const q = query.trim()
      const { data } = await supabase
        .from('devotions')
        .select('month, day, title, verse_reference, body')
        .eq('published', true)
        .or(
          `title.ilike.%${q}%,verse_reference.ilike.%${q}%,verse_text.ilike.%${q}%,body.ilike.%${q}%,prayer.ilike.%${q}%`
        )
        .order('month', { ascending: true })
        .order('day', { ascending: true })
        .limit(30)

      setResults(data ?? [])
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  if (!ready) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-24 rounded bg-white/20 animate-pulse mx-auto" />
        <div className="h-12 w-full rounded-xl bg-white/20 animate-pulse" />
        <div className="rounded-2xl border border-steel/15 bg-white p-8 shadow-sm space-y-5 animate-pulse">
          <div className="flex flex-col items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-steel/10" />
            <div className="h-4 w-48 rounded bg-steel/10" />
            <div className="h-3 w-64 rounded bg-steel/10" />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-steel/10" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const SUGGESTIONS = ['forgiveness', 'gratitude', 'hope', 'surrender', 'prayer', 'healing']

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-blue text-shadow-hero text-center">Search</h1>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Start typing to search…"
        autoFocus
        className="w-full rounded-xl border border-steel/20 bg-white px-4 py-3 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30 shadow-sm"
      />

      {query.length < 2 ? (
        <AnimatedCard>
          <div className="rounded-2xl border border-steel/15 bg-white p-8 shadow-sm space-y-5">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-steel/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-steel">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <p className="text-sm font-medium text-charcoal">Search across all devotions</p>
              <p className="text-xs text-muted leading-relaxed">
                Find devotions by keyword, topic, or verse reference.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs uppercase tracking-widest text-steel">Try searching for</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="rounded-full border border-steel/20 bg-canvas px-3 py-1.5 text-sm text-charcoal hover:bg-steel/10 hover:border-steel/30 transition-colors capitalize"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </AnimatedCard>
      ) : searching ? (
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm flex items-start justify-between gap-4 animate-pulse">
              <div className="min-w-0 space-y-2 flex-1">
                <div className="h-3 w-16 rounded bg-steel/10" />
                <div className="h-4 w-3/5 rounded bg-steel/10" />
                <div className="h-3 w-2/5 rounded bg-steel/10" />
                <div className="h-3 w-full rounded bg-steel/10" />
              </div>
              <div className="h-8 w-14 rounded-lg bg-steel/10 shrink-0" />
            </li>
          ))}
        </ul>
      ) : results.length === 0 ? (
        <AnimatedCard>
          <div className="rounded-2xl border border-steel/15 bg-white p-8 text-center shadow-sm space-y-2">
            <p className="text-charcoal font-medium text-sm">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-muted text-xs leading-relaxed">Try a different keyword or topic, or <Link href="/browse" className="text-steel hover:underline">browse all devotions</Link>.</p>
          </div>
        </AnimatedCard>
      ) : (
        <ul className="space-y-3">
          {results.map((r, index) => (
            <li key={`${r.month}-${r.day}`}>
              <AnimatedCard delay={index * 0.05}>
                <div className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs uppercase tracking-widest text-steel">
                      {MONTHS[r.month]} {r.day}
                    </p>
                    <p className="text-base font-semibold text-charcoal">{r.title}</p>
                    <p className="text-sm text-muted">{r.verse_reference}</p>
                    <p className="text-sm text-charcoal/70 leading-relaxed">
                      {snippet(r.body)}
                    </p>
                  </div>
                  <Link
                    href={`/devotion/${r.month}/${r.day}`}
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

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  )
}
