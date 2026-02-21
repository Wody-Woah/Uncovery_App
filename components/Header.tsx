'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) checkAdmin(user.id)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        checkAdmin(currentUser.id)
      } else {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkAdmin(userId: string) {
    const { data } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .single()
    setIsAdmin(!!data)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        'text-sm transition-colors',
        pathname === href || pathname?.startsWith(href + '/')
          ? 'text-steel font-medium'
          : 'text-charcoal hover:text-steel'
      )}
    >
      {label}
    </Link>
  )

  return (
    <header className="border-b border-steel/20 bg-canvas sticky top-0 z-10">
      <div className="mx-auto max-w-reading px-4 py-4 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/dashboard"
          className="text-steel font-semibold tracking-widest text-xs uppercase"
        >
          The Uncovery Devotional
        </Link>

        {/* Nav — hidden on mobile (BottomNav handles mobile navigation) */}
        <nav className="hidden md:flex items-center gap-6">
          {navLink('/today', 'Today')}
          {navLink('/browse', 'Browse')}
          {navLink('/search', 'Search')}
          {isAdmin && navLink('/admin', 'Admin')}

          {user ? (
            <button
              onClick={handleLogout}
              className="text-sm text-muted hover:text-charcoal transition-colors"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="text-sm text-steel hover:text-steel/70 transition-colors"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
