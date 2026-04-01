'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

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

  // ESC closes both the sign-out modal and the user menu
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowSignOutModal(false)
        setShowUserMenu(false)
      }
    }
    if (showSignOutModal || showUserMenu) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSignOutModal, showUserMenu])

  // Click outside closes the user menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserMenu])

  async function checkAdmin(userId: string) {
    const { data } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .single()
    setIsAdmin(!!data)
  }

  async function handleLogout() {
    setShowSignOutModal(false)
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
    <>
      {/* Sign out confirmation modal */}
      {showSignOutModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/40 px-4"
          onClick={() => setShowSignOutModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-steel/20 bg-white p-6 shadow-lg space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-semibold text-charcoal">Sign out?</h2>
              <p className="text-sm text-muted mt-1">Are you sure you want to sign out?</p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleLogout}
                className="rounded-lg bg-steel px-4 py-2 text-white text-sm font-medium hover:bg-steel/90 transition-colors"
              >
                Sign out
              </button>
              <button
                onClick={() => setShowSignOutModal(false)}
                className="text-sm text-muted hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="border-b border-steel/20 bg-canvas fixed top-0 inset-x-0 z-40">
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
            {navLink('/groups', 'Groups')}
            {navLink('/search', 'Search')}
            {isAdmin && navLink('/admin', 'Admin')}

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="text-sm text-black hover:text-steel transition-colors"
                >
                  User
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-steel/20 bg-white shadow-lg py-1 z-20">
                    <Link
                      href="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex w-full items-center px-4 py-2.5 text-sm text-charcoal hover:bg-canvas transition-colors"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/book"
                      onClick={() => setShowUserMenu(false)}
                      className="flex w-full items-center px-4 py-2.5 text-sm text-charcoal hover:bg-canvas transition-colors"
                    >
                      Book
                    </Link>
                    <button
                      onClick={() => { setShowUserMenu(false); setShowSignOutModal(true) }}
                      className="flex w-full items-center px-4 py-2.5 text-sm text-charcoal hover:bg-canvas transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
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
    </>
  )
}
