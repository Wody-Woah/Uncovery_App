'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin } from '@/lib/isAdmin'

type Status = 'loading' | 'unauthorized' | 'ready'

const PAGE_SIZE = 25

type Devotion = {
  id: string
  month: number
  day: number
  title: string
  published: boolean
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

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
    return <div className="py-20 text-center text-muted text-sm">Checking access…</div>
  }

  if (status === 'unauthorized') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-charcoal font-medium">Not authorized.</p>
          <p className="text-sm text-muted">You don&apos;t have admin access.</p>
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
            <Link href="/admin" className="text-sm text-steel hover:underline">
              Admin
            </Link>
            <span className="text-sm text-muted">/</span>
            <span className="text-sm text-muted">All Devotions</span>
          </div>
          <h1 className="text-2xl font-semibold text-charcoal">All Devotions</h1>
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
      <div className="rounded-2xl border border-steel/20 bg-white shadow-sm overflow-hidden">
        {fetching ? (
          <div className="py-16 text-center text-muted text-sm">Loading devotions…</div>
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

      {/* Pagination */}
      {!fetching && filtered.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted">
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
            <span className="px-3 py-1.5 text-sm text-muted tabular-nums">
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
