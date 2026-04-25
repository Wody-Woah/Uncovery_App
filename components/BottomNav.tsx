'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Icons (inline SVG, 20×20)
// ---------------------------------------------------------------------------


function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </svg>
  )
}

function BrowseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 10h16M4 14h10M4 18h6" />
    </svg>
  )
}




function DotsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  )
}

function JournalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="9" r="3" />
      <path d="M6.5 19.5a6 6 0 0111 0" />
    </svg>
  )
}


function AdminIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}


function SignOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function GroupsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <path d="M16 3.13a4 4 0 010 7.75" />
      <path d="M21 21v-2a4 4 0 00-3-3.85" />
    </svg>
  )
}

const TABS = [
  { href: '/dashboard', label: 'Home',    icon: <HomeIcon /> },
  { href: '/today',     label: 'Today',   icon: <CalendarIcon /> },
  { href: '/groups',    label: 'Groups',  icon: <GroupsIcon /> },
  { href: '/journal',   label: 'Journal', icon: <JournalIcon /> },
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

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
        .channel(`unread_${group_id}`)
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
        fetchUnreadCount(user.id)
        setupGroupChannels(user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        checkAdmin(u.id)
        fetchUnreadCount(u.id)
        setupGroupChannels(u.id)
      } else {
        setIsAdmin(false)
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

  async function checkAdmin(userId: string) {
    const { data } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .single()
    setIsAdmin(!!data)
  }

  async function handleSignOut() {
    setShowMore(false)
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  // Don't render for unauthenticated users
  if (!user) return null

  return (
    <>
      {/* More sheet */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-40 bg-charcoal/20"
            onClick={() => setShowMore(false)}
          />
          <div
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl bg-canvas border-t border-steel/15 shadow-xl md:hidden"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 80px)' }}
          >
            {/* Drag handle */}
            <div className="w-8 h-1 rounded-full bg-steel/20 mx-auto mt-3 mb-2" />

            <div className="px-4 py-2 space-y-1">
              <Link
                href="/browse"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-charcoal hover:bg-white transition-colors"
              >
                <span className="text-muted"><BrowseIcon /></span>
                Browse Devotions
              </Link>
              <Link
                href="/bookmarks"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-charcoal hover:bg-white transition-colors"
              >
                <span className="text-muted"><BookmarkIcon /></span>
                Bookmarks
              </Link>
              <Link
                href="/profile"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-charcoal hover:bg-white transition-colors"
              >
                <span className="text-muted"><ProfileIcon /></span>
                Profile & Settings
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setShowMore(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-charcoal hover:bg-white transition-colors"
                >
                  <span className="text-muted"><AdminIcon /></span>
                  Admin
                </Link>
              )}
              <div className="border-t border-steel/10 my-1" />
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted hover:bg-white transition-colors"
              >
                <SignOutIcon />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-canvas border-t border-steel/15"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {TABS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2"
            >
              <span className={`relative ${isActive(href) ? 'text-steel' : 'text-muted'}`}>
                {icon}
                {href === '/groups' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-0.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              <span className={`text-[10px] ${isActive(href) ? 'text-steel font-medium' : 'text-muted'}`}>
                {label}
              </span>
            </Link>
          ))}

          {/* More button */}
          <button
            onClick={() => setShowMore((v) => !v)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2"
          >
            <span className={showMore ? 'text-steel' : 'text-muted'}><DotsIcon /></span>
            <span className={`text-[10px] ${showMore ? 'text-steel font-medium' : 'text-muted'}`}>More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
