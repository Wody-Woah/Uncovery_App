'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

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

export default function SearchPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [query, setQuery] = useState('')
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
    return <div className="py-20 text-center text-white font-semibold text-sm text-shadow-hero">Loading…</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white text-shadow-hero mb-4">Search</h1>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, verses, and devotion text"
          autoFocus
          className="w-full rounded-xl border border-steel/20 bg-white px-4 py-3 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30 shadow-sm"
        />
      </div>

      {/* States */}
      {query.length < 2 ? (
        <p className="text-center text-white/80 font-semibold text-sm pt-4 text-shadow-hero">Type to search…</p>
      ) : searching ? (
        <p className="text-center text-white/80 font-semibold text-sm pt-4 text-shadow-hero">Searching…</p>
      ) : results.length === 0 ? (
        <p className="text-center text-white/80 font-semibold text-sm pt-4 text-shadow-hero">
          No results for &ldquo;{query}&rdquo;
        </p>
      ) : (
        <ul className="space-y-3">
          {results.map((r) => (
            <li
              key={`${r.month}-${r.day}`}
              className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm flex items-start justify-between gap-4"
            >
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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
