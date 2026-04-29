'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import Avatar from '@/components/Avatar'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const groupChannelsRef = useRef<ReturnType<typeof supabase.channel>[]>([])

  async function fetchUnreadCount(userId: string) {
    const [receiptsRes, membershipsRes] = await Promise.all([
      supabase.from('group_read_receipts').select('group_id, last_read_at').eq('user_id', userId),
      supabase.from('group_members').select('group_id').eq('user_id', userId),
    ])

    const memberGroupIds = new Set((membershipsRes.data ?? []).map((m: { group_id: string }) => m.group_id))
    const receipts = (receiptsRes.data ?? []).filter((r: { group_id: string }) => memberGroupIds.has(r.group_id))

    if (!receipts.length) { setUnreadCount(0); return }

    const counts = await Promise.all(receipts.map(async (r: { group_id: string; last_read_at: string }) => {
      const { count } = await supabase
        .from('group_messages')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', r.group_id)
        .neq('user_id', userId)
        .gt('created_at', r.last_read_at)
      return count ?? 0
    }))
    setUnreadCount(counts.reduce((a, b) => a + b, 0))
  }

  async function setupGroupChannels(userId: string) {
    groupChannelsRef.current.forEach((ch: ReturnType<typeof supabase.channel>) => supabase.removeChannel(ch))
    groupChannelsRef.current = []

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)

    groupChannelsRef.current = (memberships ?? []).map(({ group_id }) =>
      supabase
        .channel(`header_unread_${group_id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${group_id}`,
        }, () => fetchUnreadCount(userId))
        .subscribe()
    )
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        checkAdmin(user.id)
        fetchProfile(user.id)
        fetchUnreadCount(user.id)
        setupGroupChannels(user.id)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        checkAdmin(currentUser.id)
        fetchProfile(currentUser.id)
        fetchUnreadCount(currentUser.id)
        setupGroupChannels(currentUser.id)
      } else {
        setIsAdmin(false)
        setDisplayName(null)
        setAvatarUrl(null)
        setUnreadCount(0)
        groupChannelsRef.current.forEach((ch: ReturnType<typeof supabase.channel>) => supabase.removeChannel(ch))
        groupChannelsRef.current = []
      }
    })

    return () => {
      subscription.unsubscribe()
      groupChannelsRef.current.forEach((ch: ReturnType<typeof supabase.channel>) => supabase.removeChannel(ch))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user) fetchUnreadCount(user.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (!user) return
    function handleGroupRead() { fetchUnreadCount(user!.id) }
    window.addEventListener('uncovery:group-read', handleGroupRead)
    return () => window.removeEventListener('uncovery:group-read', handleGroupRead)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single()
    if (data) {
      setDisplayName(data.display_name)
      setAvatarUrl(data.avatar_url)
    }
  }

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

      <header className="fixed top-0 inset-x-0 z-40 bg-canvas border-b border-steel/20">
        <div className="mx-auto max-w-reading px-4 py-4 flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/dashboard"
            className="font-semibold tracking-widest text-xs uppercase text-steel flex-1 text-center md:flex-none md:text-left"
          >
            The Uncovery Devotional
          </Link>

          {/* Nav — hidden on mobile (BottomNav handles mobile navigation) */}
          <nav className="hidden md:flex items-center gap-6">
            {user && navLink('/today', 'Today')}
            {user && navLink('/journal', 'Journal')}
            {user && (
              <Link
                href="/groups"
                className={cn(
                  'relative text-sm transition-colors',
                  pathname === '/groups' || pathname?.startsWith('/groups/')
                    ? 'text-steel font-medium'
                    : 'text-charcoal hover:text-steel'
                )}
              >
                Groups
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-3.5 flex h-4 min-w-4 px-0.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            {user && navLink('/search', 'Search')}
            {isAdmin && navLink('/admin', 'Admin')}

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-steel/40"
                >
                  <Avatar avatarUrl={avatarUrl} displayName={displayName} size="sm" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-steel/20 bg-white shadow-lg py-1 z-20">
                    <Link href="/dashboard" onClick={() => setShowUserMenu(false)} className="flex w-full items-center px-4 py-2.5 text-sm text-charcoal hover:bg-canvas transition-colors">Dashboard</Link>
                    <Link href="/browse" onClick={() => setShowUserMenu(false)} className="flex w-full items-center px-4 py-2.5 text-sm text-charcoal hover:bg-canvas transition-colors">Browse Devotions</Link>
                    <Link href="/bookmarks" onClick={() => setShowUserMenu(false)} className="flex w-full items-center px-4 py-2.5 text-sm text-charcoal hover:bg-canvas transition-colors">Bookmarks</Link>
                    <Link href="/book" onClick={() => setShowUserMenu(false)} className="flex w-full items-center px-4 py-2.5 text-sm text-charcoal hover:bg-canvas transition-colors">Book</Link>
                    <div className="border-t border-steel/10 my-1" />
                    <Link href="/profile" onClick={() => setShowUserMenu(false)} className="flex w-full items-center px-4 py-2.5 text-sm text-charcoal hover:bg-canvas transition-colors">Profile & Settings</Link>
                    <div className="border-t border-steel/10 my-1" />
                    <button onClick={() => { setShowUserMenu(false); setShowSignOutModal(true) }} className="flex w-full items-center px-4 py-2.5 text-sm text-charcoal hover:bg-canvas transition-colors">Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              !pathname?.startsWith('/login') && !pathname?.startsWith('/signup') && (
                <Link
                  href="/login"
                  className="text-sm text-steel hover:text-steel/70 transition-colors"
                >
                  Sign in
                </Link>
              )
            )}
          </nav>
        </div>
      </header>
    </>
  )
}
