'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin } from '@/lib/isAdmin'

type Status = 'loading' | 'unauthenticated' | 'unauthorized' | 'admin'

export default function AdminPage() {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setStatus('unauthenticated')
        return
      }

      const admin = await isAdmin()
      setStatus(admin ? 'admin' : 'unauthorized')
    }

    checkAccess()
  }, [])

  if (status === 'loading') {
    return (
      <div className="py-20 text-center text-white font-semibold text-sm text-shadow-hero">Checking access…</div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white font-semibold text-shadow-hero">You need to be signed in to view this page.</p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-steel px-5 py-2.5 text-white text-sm font-medium hover:bg-steel/90 transition-colors"
          >
            Sign in
          </Link>
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-brand-blue text-shadow-hero mb-1">Admin</p>
        <h1 className="text-2xl font-semibold text-white text-shadow-hero">Dashboard</h1>
        <p className="text-sm text-brand-blue text-shadow-hero mt-1">Manage devotions and content.</p>
      </div>

      {/* Action cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/devotions/new"
          className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm hover:border-steel/40 transition-colors group"
        >
          <p className="text-xs uppercase tracking-widest text-steel mb-2">Create</p>
          <h2 className="text-lg font-semibold text-charcoal group-hover:text-steel transition-colors">
            New Devotion
          </h2>
          <p className="text-sm text-muted mt-1">Write and publish a new daily devotion.</p>
        </Link>

        <Link
          href="/admin/devotions"
          className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm hover:border-steel/40 transition-colors group"
        >
          <p className="text-xs uppercase tracking-widest text-steel mb-2">Manage</p>
          <h2 className="text-lg font-semibold text-charcoal group-hover:text-steel transition-colors">
            All Devotions
          </h2>
          <p className="text-sm text-muted mt-1">View, edit, or unpublish existing devotions.</p>
        </Link>

        <Link
          href="/admin/updates"
          className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm hover:border-steel/40 transition-colors group"
        >
          <p className="text-xs uppercase tracking-widest text-steel mb-2">Author</p>
          <h2 className="text-lg font-semibold text-charcoal group-hover:text-steel transition-colors">
            From the Author
          </h2>
          <p className="text-sm text-muted mt-1">Create and manage author updates.</p>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm hover:border-steel/40 transition-colors group"
        >
          <p className="text-xs uppercase tracking-widest text-steel mb-2">Manage</p>
          <h2 className="text-lg font-semibold text-charcoal group-hover:text-steel transition-colors">
            Users
          </h2>
          <p className="text-sm text-muted mt-1">View, search, and manage user accounts.</p>
        </Link>
      </div>
    </div>
  )
}
