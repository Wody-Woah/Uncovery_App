'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin } from '@/lib/isAdmin'
import AnimatedCard from '@/components/AnimatedCard'

type Report = {
  id: string
  group_id: string
  group_name: string
  reporter_display_name: string
  reported_display_name: string
  reported_user_id: string
  message_content: string | null
  reason: string | null
  reason_note: string | null
  status: string
  created_at: string
}

type Ban = {
  group_id: string
  user_id: string
}

export default function AdminReportsPage() {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([])
  const [bans, setBans] = useState<Ban[]>([])
  const [actioning, setActioning] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'resolved'>('pending')

  useEffect(() => {
    async function init() {
      const admin = await isAdmin()
      if (!admin) { setLoading(false); return }
      setAuthorized(true)
      await fetchReports()
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchReports() {
    const { data: reportsData } = await supabase
      .from('group_reports')
      .select('id, group_id, reporter_user_id, reported_user_id, message_content, reason, reason_note, status, created_at')
      .order('created_at', { ascending: false })

    if (!reportsData?.length) { setReports([]); return }

    const groupIds = Array.from(new Set(reportsData.map((r) => r.group_id)))
    const userIds = Array.from(new Set([
      ...reportsData.map((r) => r.reporter_user_id),
      ...reportsData.map((r) => r.reported_user_id),
    ]))

    const [groupsRes, profilesRes, bansRes] = await Promise.all([
      supabase.from('groups').select('id, name').in('id', groupIds),
      supabase.from('profiles').select('id, display_name').in('id', userIds),
      supabase.from('group_bans').select('group_id, user_id').in('group_id', groupIds),
    ])

    const groupMap = Object.fromEntries((groupsRes.data ?? []).map((g: { id: string; name: string }) => [g.id, g.name]))
    const profileMap = Object.fromEntries((profilesRes.data ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name ?? 'Unknown']))

    setBans(bansRes.data ?? [])
    setReports(reportsData.map((r) => ({
      id: r.id,
      group_id: r.group_id,
      group_name: groupMap[r.group_id] ?? 'Unknown Group',
      reporter_display_name: profileMap[r.reporter_user_id] ?? 'Unknown',
      reported_display_name: profileMap[r.reported_user_id] ?? 'Unknown',
      reported_user_id: r.reported_user_id,
      message_content: r.message_content,
      reason: r.reason ?? null,
      reason_note: r.reason_note ?? null,
      status: r.status,
      created_at: r.created_at,
    })))
  }

  async function handleDismiss(reportId: string) {
    if (actioning) return
    setActioning(reportId)
    await supabase.from('group_reports').update({ status: 'resolved' }).eq('id', reportId)
    setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: 'resolved' } : r))
    setActioning(null)
  }

  async function handleBan(report: Report) {
    if (actioning) return
    setActioning(report.id)
    await Promise.all([
      supabase.from('group_bans').upsert(
        { group_id: report.group_id, user_id: report.reported_user_id, reason: 'Banned via report' },
        { onConflict: 'group_id,user_id' }
      ),
      supabase.from('group_members').delete().eq('group_id', report.group_id).eq('user_id', report.reported_user_id),
      supabase.from('group_messages').delete().eq('group_id', report.group_id).eq('user_id', report.reported_user_id),
      supabase.from('group_reports').update({ status: 'resolved' }).eq('id', report.id),
    ])
    setBans((prev) => [...prev, { group_id: report.group_id, user_id: report.reported_user_id }])
    setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status: 'resolved' } : r))
    setActioning(null)
  }

  async function handleUnban(report: Report) {
    if (actioning) return
    setActioning(report.id)
    await supabase.from('group_bans').delete().eq('group_id', report.group_id).eq('user_id', report.reported_user_id)
    setBans((prev) => prev.filter((b) => !(b.group_id === report.group_id && b.user_id === report.reported_user_id)))
    setActioning(null)
  }

  function isBanned(report: Report) {
    return bans.some((b) => b.group_id === report.group_id && b.user_id === report.reported_user_id)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 rounded bg-white/20 animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-3 animate-pulse">
            <div className="h-4 w-1/3 rounded bg-steel/10" />
            <div className="h-3 w-2/3 rounded bg-steel/10" />
            <div className="h-3 w-1/2 rounded bg-steel/10" />
          </div>
        ))}
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-white font-semibold text-shadow-hero">Not authorized.</p>
      </div>
    )
  }

  const filtered = reports.filter((r) => r.status === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-xs text-brand-blue text-shadow-hero hover:underline">← Admin</Link>
          <h1 className="text-2xl font-semibold text-white text-shadow-hero mt-0.5">Reports</h1>
        </div>
        <div className="flex gap-2">
          {(['pending', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                filter === f ? 'bg-white text-charcoal' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {f}
              {f === 'pending' && reports.filter((r) => r.status === 'pending').length > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-sunrise text-[9px] font-bold text-white">
                  {reports.filter((r) => r.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <AnimatedCard>
          <div className="rounded-2xl border border-steel/15 bg-white p-8 text-center">
            <p className="text-sm text-muted">No {filter} reports.</p>
          </div>
        </AnimatedCard>
      ) : (
        <div className="space-y-4">
          {filtered.map((report, i) => (
            <AnimatedCard key={report.id} delay={i * 0.05}>
              <div className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs uppercase tracking-widest text-steel">{report.group_name}</p>
                    <p className="text-sm font-semibold text-charcoal">
                      {report.reported_display_name}
                      {isBanned(report) && (
                        <span className="ml-2 text-xs font-normal text-sunrise bg-sunrise/10 rounded-full px-2 py-0.5">Banned</span>
                      )}
                    </p>
                    <p className="text-xs text-muted">Reported by {report.reporter_display_name} · {formatDate(report.created_at)}</p>
                  </div>
                  {report.status === 'resolved' && (
                    <span className="text-xs text-steel bg-steel/10 rounded-full px-2.5 py-0.5 shrink-0">Resolved</span>
                  )}
                </div>

                {/* Reason */}
                {report.reason && (
                  <div className="space-y-1">
                    <span className="inline-block text-xs font-medium text-steel bg-steel/10 rounded-full px-2.5 py-0.5">{report.reason}</span>
                    {report.reason_note && (
                      <p className="text-xs text-muted leading-relaxed">{report.reason_note}</p>
                    )}
                  </div>
                )}

                {/* Message snapshot */}
                {report.message_content && (
                  <p className="text-sm text-charcoal/70 bg-canvas rounded-lg px-3 py-2.5 italic line-clamp-4">
                    &ldquo;{report.message_content}&rdquo;
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {report.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleDismiss(report.id)}
                        disabled={actioning === report.id}
                        className="rounded-lg border border-steel/20 bg-white px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-canvas transition-colors disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                      {!isBanned(report) ? (
                        <button
                          onClick={() => handleBan(report)}
                          disabled={actioning === report.id}
                          className="rounded-lg bg-sunrise px-3 py-1.5 text-xs font-medium text-white hover:bg-sunrise/90 transition-colors disabled:opacity-50"
                        >
                          {actioning === report.id ? 'Working…' : 'Ban & Remove'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnban(report)}
                          disabled={actioning === report.id}
                          className="rounded-lg border border-steel/20 bg-white px-3 py-1.5 text-xs font-medium text-steel hover:bg-canvas transition-colors disabled:opacity-50"
                        >
                          {actioning === report.id ? 'Working…' : 'Unban'}
                        </button>
                      )}
                    </>
                  )}
                  {report.status === 'resolved' && isBanned(report) && (
                    <button
                      onClick={() => handleUnban(report)}
                      disabled={actioning === report.id}
                      className="rounded-lg border border-steel/20 bg-white px-3 py-1.5 text-xs font-medium text-steel hover:bg-canvas transition-colors disabled:opacity-50"
                    >
                      {actioning === report.id ? 'Working…' : 'Unban'}
                    </button>
                  )}
                </div>
              </div>
            </AnimatedCard>
          ))}
        </div>
      )}
    </div>
  )
}
