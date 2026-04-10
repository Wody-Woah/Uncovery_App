'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Group = {
  id: string
  name: string
  description: string | null
}

export default function GroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get group IDs the user belongs to
      const { data: memberRows } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)

      const groupIds = memberRows?.map((r) => r.group_id) ?? []

      if (groupIds.length === 0) {
        setLoading(false)
        return
      }

      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, name, description')
        .in('id', groupIds)
        .order('created_at', { ascending: false })

      setGroups(groupsData ?? [])
      setLoading(false)
    }

    init()
  }, [router])

  if (loading) {
    return <div className="py-20 text-center text-white text-sm text-shadow-hero">Loading…</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-blue text-shadow-hero text-center">Small Groups</h1>
        <p className="text-sm text-white/80 text-shadow-hero mt-1 text-center">
          Read together. Reflect together. Stay connected.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/groups/new"
          className="flex-1 rounded-xl bg-steel px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-steel/90 transition-colors"
        >
          Create a group
        </Link>
        <Link
          href="/groups/join"
          className="flex-1 rounded-xl border border-steel/30 bg-white px-4 py-2.5 text-center text-sm font-medium text-charcoal hover:bg-canvas transition-colors"
        >
          Join with code
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-steel/15 bg-white p-8 shadow-sm space-y-3">
          <p className="text-charcoal font-semibold text-base">You weren&apos;t meant to do this alone.</p>
          <p className="text-muted text-sm leading-relaxed">
            Create a private group for friends, family, or a recovery community. Each day, your group gets a shared space to reflect on the devotion — ask questions, share what&apos;s stirring, and remind each other you&apos;re not doing this alone.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="block rounded-2xl border border-steel/15 bg-white p-5 shadow-sm hover:border-steel/30 transition-colors"
            >
              <p className="font-medium text-charcoal">{group.name}</p>
              {group.description && (
                <p className="text-sm text-muted mt-0.5 line-clamp-1">{group.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
