'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin } from '@/lib/isAdmin'
import AnimatedCard from '@/components/AnimatedCard'

type Status = 'loading' | 'unauthorized' | 'ready'

type AuthorUpdate = {
  id: string
  title: string
  published: boolean
  pinned: boolean
  created_at: string
}

export default function AdminUpdatesPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [updates, setUpdates] = useState<AuthorUpdate[]>([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const admin = await isAdmin()
      if (!admin) { setStatus('unauthorized'); return }
      setStatus('ready')

      const { data } = await supabase
        .from('author_updates')
        .select('id, title, published, pinned, created_at')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })

      setUpdates(data ?? [])
    }

    init()
  }, [router])

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-sm text-blue-300 hover:underline text-shadow-hero">Admin</Link>
            <span className="text-sm text-white text-shadow-hero">/</span>
            <span className="text-sm text-white text-shadow-hero">From the Author</span>
          </div>
          <h1 className="text-2xl font-semibold text-white text-shadow-hero">From the Author</h1>
        </div>
        <Link
          href="/admin/updates/new"
          className="shrink-0 rounded-lg bg-steel px-4 py-2 text-white text-sm font-medium hover:bg-steel/90 transition-colors"
        >
          + New Update
        </Link>
      </div>

      {/* List */}
      <AnimatedCard>
      <div className="rounded-2xl border border-steel/20 bg-white shadow-sm overflow-hidden">
        {updates.length === 0 ? (
          <div className="py-16 text-center text-muted text-sm">No updates yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_120px_48px] gap-4 px-5 py-3 border-b border-steel/10 bg-canvas">
              <span className="text-xs uppercase tracking-widest text-steel">Title</span>
              <span className="text-xs uppercase tracking-widest text-steel">Status</span>
              <span />
            </div>
            <ul className="divide-y divide-steel/10">
              {updates.map((u) => (
                <li
                  key={u.id}
                  className="grid grid-cols-[1fr_120px_48px] gap-4 items-center px-5 py-3.5 hover:bg-canvas/60 transition-colors"
                >
                  <span className="text-sm text-charcoal truncate">
                    {u.pinned && <span className="text-steel mr-1.5">📌</span>}
                    {u.title}
                  </span>
                  <span>
                    {u.published ? (
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
                      href={`/admin/updates/${u.id}/edit`}
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
    </div>
  )
}
