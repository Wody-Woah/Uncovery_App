'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin } from '@/lib/isAdmin'
import AnimatedCard from '@/components/AnimatedCard'
import { MONTHS } from '@/lib/constants'

type Status = 'loading' | 'unauthorized' | 'ready'

const PAGE_SIZE = 25

type Devotion = {
  id: string
  month: number
  day: number
  title: string
  published: boolean
}

export default function ManageDevotionsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [devotions, setDevotions] = useState<Devotion[]>([])
  const [fetching, setFetching] = useState(true)

  const [monthFilter, setMonthFilter] = useState(0) // 0 = All
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const admin = await isAdmin()
      if (!admin) {
        setStatus('unauthorized')
        return
      }
      setStatus('ready')

      const { data } = await supabase
        .from('devotions')
        .select('id, month, day, title, published')
        .order('month', { ascending: true })
        .order('day', { ascending: true })

      setDevotions(data ?? [])
      setFetching(false)
    }
    init()
  }, [router])

  const filtered = devotions.filter((d) => {
    if (monthFilter !== 0 && d.month !== monthFilter) return false
    if (search.trim() && !d.title.toLowerCase().includes(search.trim().toLowerCase()))
      return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  const rangeStart = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1
  const rangeEnd = Math.min((safePage + 1) * PAGE_SIZE, filtered.length)

  if (status === 'loading') {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-40 rounded bg-white/20 animate-pulse" />
            <div className="h-7 w-36 rounded bg-white/20 animate-pulse" />
          </div>
          <div className="h-9 w-16 rounded-lg bg-white/20 animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-36 rounded-lg bg-white/20 animate-pulse" />
          <div className="h-9 flex-1 rounded-lg bg-white/20 animate-pulse" />
        </div>
        <div className="rounded-2xl border border-steel/20 bg-white shadow-sm overflow-hidden animate-pulse">
          <div className="px-5 py-3 border-b border-steel/10 bg-canvas flex gap-4">
            {[80, 160, 100, 40].map((w, i) => (
              <div key={i} className="h-3 rounded bg-steel/10" style={{ width: w }} />
            ))}
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 items-center px-5 py-3.5 border-b border-steel/10 last:border-0">
              <div className="h-3 w-[80px] rounded bg-steel/10" />
              <div className="h-3 flex-1 rounded bg-steel/10" />
              <div className="h-5 w-[80px] rounded-full bg-steel/10" />
              <div className="h-3 w-8 rounded bg-steel/10" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (status === 'unauthorized') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-white font-semibold text-shadow-hero">Not authorized.</p>
          <p className="text-sm text-white/80 text-shadow-hero">You don&apos;t have admin access.</p>
        </div>
      </div>
    )
  }

  const controlClass =
    'rounded-lg border border-steel/20 bg-canvas px-3 py-2 text-sm text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-sm text-blue-300 hover:underline text-shadow-hero">
              Admin
            </Link>
            <span className="text-sm text-white text-shadow-hero">/</span>
            <span className="text-sm text-white text-shadow-hero">All Devotions</span>
          </div>
          <h1 className="text-2xl font-semibold text-white text-shadow-hero">All Devotions</h1>
        </div>
        <Link
          href="/admin/devotions/new"
          className="shrink-0 rounded-lg bg-steel px-4 py-2 text-white text-sm font-medium hover:bg-steel/90 transition-colors"
        >
          + New
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={monthFilter}
          onChange={(e) => { setMonthFilter(Number(e.target.value)); setPage(0) }}
          className={controlClass}
        >
          <option value={0}>All months</option>
          {MONTHS.map((name, i) => (
            <option key={i + 1} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search by title…"
          className={`${controlClass} flex-1`}
        />
      </div>

      {/* Table */}
      <AnimatedCard>
      <div className="rounded-2xl border border-steel/20 bg-white shadow-sm overflow-hidden">
        {fetching ? (
          <div className="animate-pulse">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 items-center px-5 py-3.5 border-b border-steel/10 last:border-0">
                <div className="h-3 w-[80px] rounded bg-steel/10" />
                <div className="h-3 flex-1 rounded bg-steel/10" />
                <div className="h-5 w-[80px] rounded-full bg-steel/10" />
                <div className="h-3 w-8 rounded bg-steel/10" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted text-sm">
            {devotions.length === 0
              ? 'No devotions yet. Create one to get started.'
              : 'No devotions match your filters.'}
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[80px_1fr_100px_48px] gap-4 px-5 py-3 border-b border-steel/10 bg-canvas">
              <span className="text-xs uppercase tracking-widest text-steel">Date</span>
              <span className="text-xs uppercase tracking-widest text-steel">Title</span>
              <span className="text-xs uppercase tracking-widest text-steel">Status</span>
              <span />
            </div>

            {/* Rows */}
            <ul className="divide-y divide-steel/10">
              {paginated.map((d) => (
                <li
                  key={d.id}
                  className="grid grid-cols-[80px_1fr_100px_48px] gap-4 items-center px-5 py-3.5 hover:bg-canvas/60 transition-colors"
                >
                  <span className="text-sm text-muted tabular-nums whitespace-nowrap">
                    {MONTHS[d.month - 1].slice(0, 3)} {d.day}
                  </span>

                  <span className="text-sm text-charcoal truncate">{d.title}</span>

                  <span>
                    {d.published ? (
                      <span className="inline-flex items-center rounded-full bg-steel/10 px-2.5 py-0.5 text-xs font-medium text-steel">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-steel/15 bg-canvas px-2.5 py-0.5 text-xs font-medium text-muted">
                        Draft
                      </span>
                    )}
                  </span>

                  <span className="text-right">
                    <Link
                      href={`/admin/devotions/${d.id}/edit`}
                      className="text-sm text-steel hover:underline"
                    >
                      Edit
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      </AnimatedCard>

      {/* Pagination */}
      {!fetching && filtered.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-white text-shadow-hero">
            {rangeStart}–{rangeEnd} of {filtered.length} devotion
            {filtered.length !== 1 ? 's' : ''}
            {filtered.length !== devotions.length && (
              <span> (filtered from {devotions.length})</span>
            )}
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-lg border border-steel/20 bg-white px-3 py-1.5 text-sm text-charcoal hover:bg-canvas transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ←
            </button>
            <span className="px-3 py-1.5 text-sm text-white tabular-nums text-shadow-hero">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage === totalPages - 1}
              className="rounded-lg border border-steel/20 bg-white px-3 py-1.5 text-sm text-charcoal hover:bg-canvas transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
