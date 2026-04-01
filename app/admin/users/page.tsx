'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin } from '@/lib/isAdmin'

const PAGE_SIZE = 25

type Status = 'loading' | 'unauthorized' | 'ready'
type SortBy = 'newest' | 'oldest' | 'most_reads' | 'name'

type AppUser = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  display_name: string
  total_reads: number
  last_read: string | null
  is_admin: boolean
}

function formatDate(ts: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [users, setUsers] = useState<AppUser[]>([])
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [page, setPage] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<AppUser | null>(null)
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const admin = await isAdmin()
      if (!admin) { setStatus('unauthorized'); return }
      setStatus('ready')
      const { data } = await supabase.rpc('admin_get_users')
      setUsers(data ?? [])
      setFetching(false)
    }
    init()
  }, [router])

  const filtered = users.filter((u) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'most_reads': return b.total_reads - a.total_reads
      case 'name': return a.display_name.localeCompare(b.display_name)
    }
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const paginated = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  const rangeStart = sorted.length === 0 ? 0 : safePage * PAGE_SIZE + 1
  const rangeEnd = Math.min((safePage + 1) * PAGE_SIZE, sorted.length)

  async function handleToggleAdmin() {
    if (!toggleTarget || togglingAdmin) return
    const u = toggleTarget
    setToggleTarget(null)
    setTogglingAdmin(u.id)
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_admin: !x.is_admin } : x))
    const { error } = await supabase.rpc('admin_toggle_admin', { target_user_id: u.id })
    if (error) setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_admin: u.is_admin } : x))
    setTogglingAdmin(null)
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: deleteTarget.id })
    if (!error) setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  if (status === 'loading') {
    return <div className="py-20 text-center text-white font-semibold text-sm text-shadow-hero">Checking access…</div>
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

  const roleButtonClass = (isAdminUser: boolean) =>
    `inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
      isAdminUser
        ? 'bg-steel/10 text-steel hover:bg-steel/20'
        : 'border border-steel/15 text-muted hover:bg-canvas'
    }`

  return (
    <div className="space-y-8">

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/40 px-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-steel/20 bg-white p-6 shadow-lg space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-semibold text-charcoal">Delete user?</h2>
              <p className="text-sm font-medium text-charcoal mt-2">{deleteTarget.display_name}</p>
              <p className="text-sm text-muted">{deleteTarget.email}</p>
              <p className="text-sm text-muted mt-2">
                This permanently deletes their account and all associated data. This cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-sunrise px-4 py-2 text-white text-sm font-medium hover:bg-sunrise/90 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete User'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-sm text-muted hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role toggle confirmation modal */}
      {toggleTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/40 px-4"
          onClick={() => setToggleTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-steel/20 bg-white p-6 shadow-lg space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-semibold text-charcoal">
                {toggleTarget.is_admin ? 'Remove admin access?' : 'Grant admin access?'}
              </h2>
              <p className="text-sm font-medium text-charcoal mt-2">{toggleTarget.display_name}</p>
              <p className="text-sm text-muted">{toggleTarget.email}</p>
              <p className="text-sm text-muted mt-2">
                {toggleTarget.is_admin
                  ? 'This user will lose access to the admin dashboard.'
                  : 'This user will gain full access to the admin dashboard.'}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleToggleAdmin}
                className="rounded-lg bg-steel px-4 py-2 text-white text-sm font-medium hover:bg-steel/90 transition-colors"
              >
                {toggleTarget.is_admin ? 'Remove Admin' : 'Make Admin'}
              </button>
              <button
                onClick={() => setToggleTarget(null)}
                className="text-sm text-muted hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin" className="text-sm text-blue-300 hover:underline text-shadow-hero">Admin</Link>
          <span className="text-sm text-white text-shadow-hero">/</span>
          <span className="text-sm text-white text-shadow-hero">Users</span>
        </div>
        <h1 className="text-2xl font-semibold text-white text-shadow-hero">Users</h1>
        {!fetching && (
          <p className="text-sm text-brand-blue text-shadow-hero mt-1">
            {users.length} total user{users.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search by name or email…"
          className={`${controlClass} flex-1`}
        />
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as SortBy); setPage(0) }}
          className={controlClass}
        >
          <option value="newest">Newest joined</option>
          <option value="oldest">Oldest joined</option>
          <option value="most_reads">Most active</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {/* User list */}
      <div className="rounded-2xl border border-steel/20 bg-white shadow-sm overflow-hidden">
        {fetching ? (
          <div className="py-16 text-center text-muted text-sm">Loading users…</div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-muted text-sm">
            {users.length === 0 ? 'No users yet.' : 'No users match your search.'}
          </div>
        ) : (
          <>
            {/* Desktop column headers — hidden on mobile */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_90px_100px_56px_64px_44px] gap-4 px-5 py-3 border-b border-steel/10 bg-canvas">
              <span className="text-xs uppercase tracking-widest text-steel">Name</span>
              <span className="text-xs uppercase tracking-widest text-steel">Email</span>
              <span className="text-xs uppercase tracking-widest text-steel">Joined</span>
              <span className="text-xs uppercase tracking-widest text-steel">Last Active</span>
              <span className="text-xs uppercase tracking-widest text-steel">Reads</span>
              <span className="text-xs uppercase tracking-widest text-steel">Role</span>
              <span />
            </div>

            <ul className="divide-y divide-steel/10">
              {paginated.map((u) => (
                <li key={u.id} className="hover:bg-canvas/60 transition-colors">

                  {/* Mobile card — hidden on sm+ */}
                  <div className="sm:hidden px-5 py-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-charcoal truncate">{u.display_name}</p>
                        <p className="text-xs text-muted truncate">{u.email}</p>
                      </div>
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="flex-shrink-0 text-sunrise/70 hover:text-sunrise transition-colors mt-0.5"
                        title="Delete user"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <span>Joined {formatDate(u.created_at)}</span>
                      <span>·</span>
                      <span>Active {formatDate(u.last_sign_in_at)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-charcoal tabular-nums">{u.total_reads} reads</span>
                      <button
                        onClick={() => setToggleTarget(u)}
                        disabled={togglingAdmin === u.id}
                        className={roleButtonClass(u.is_admin)}
                      >
                        {u.is_admin ? 'Admin' : 'User'}
                      </button>
                    </div>
                  </div>

                  {/* Desktop row — hidden on mobile */}
                  <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_90px_100px_56px_64px_44px] gap-4 items-center px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm text-charcoal truncate">{u.display_name}</p>
                    </div>
                    <span className="text-sm text-muted truncate">{u.email}</span>
                    <span className="text-sm text-muted whitespace-nowrap">{formatDate(u.created_at)}</span>
                    <span className="text-sm text-muted whitespace-nowrap">{formatDate(u.last_sign_in_at)}</span>
                    <span className="text-sm text-charcoal tabular-nums">{u.total_reads}</span>
                    <button
                      onClick={() => setToggleTarget(u)}
                      disabled={togglingAdmin === u.id}
                      className={roleButtonClass(u.is_admin)}
                    >
                      {u.is_admin ? 'Admin' : 'User'}
                    </button>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="text-sunrise/70 hover:text-sunrise transition-colors"
                        title="Delete user"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Pagination */}
      {!fetching && sorted.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-white text-shadow-hero">
            {rangeStart}–{rangeEnd} of {sorted.length} user{sorted.length !== 1 ? 's' : ''}
            {sorted.length !== users.length && <span> (filtered from {users.length})</span>}
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
