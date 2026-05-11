'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin } from '@/lib/isAdmin'
import AnimatedCard from '@/components/AnimatedCard'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'

type DataPoint = { date: string; count: number }
type AnalyticsData = {
  dau: DataPoint[]
  signups: DataPoint[]
  reads: DataPoint[]
  messages: DataPoint[]
}

const METRICS = [
  { key: 'dau'      as const, label: 'Daily Active Users', color: '#3b82f6' },
  { key: 'signups'  as const, label: 'New Signups',        color: '#10b981' },
  { key: 'reads'    as const, label: 'Devotion Reads',     color: '#f59e0b' },
  { key: 'messages' as const, label: 'Messages Sent',      color: '#8b5cf6' },
]

const RANGES = [7, 14, 30] as const
type Range = typeof RANGES[number]

function fillDates(data: DataPoint[], days: number): Array<DataPoint & { label: string }> {
  const map = Object.fromEntries(data.map(d => [d.date, d.count]))
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const key = d.toISOString().split('T')[0]
    return {
      date: key,
      count: map[key] ?? 0,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }
  })
}

export default function AdminAnalyticsPage() {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [range, setRange] = useState<Range>(14)
  const [metric, setMetric] = useState<keyof AnalyticsData>('dau')

  useEffect(() => {
    async function init() {
      const admin = await isAdmin()
      if (!admin) { setLoading(false); return }
      setAuthorized(true)
      await fetchData(14)
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchData(days: Range) {
    setFetching(true)
    const { data: result } = await supabase.rpc('admin_get_analytics', { days_back: days })
    if (result) setData(result as AnalyticsData)
    setFetching(false)
  }

  async function handleRangeChange(days: Range) {
    setRange(days)
    await fetchData(days)
  }

  if (loading) return <LoadingSkeleton />

  if (!authorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-white font-semibold text-shadow-hero">Not authorized.</p>
      </div>
    )
  }

  const activeMetric = METRICS.find(m => m.key === metric)!
  const chartData = fillDates(data?.[metric] ?? [], range)
  const values = chartData.map(d => d.count)
  const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0
  const peak = values.length ? Math.max(...values) : 0
  const total = values.reduce((a, b) => a + b, 0)
  const daysOver12 = values.filter(v => v >= 12).length

  const stats = metric === 'dau'
    ? [
        { label: 'Avg / Day',  value: avg },
        { label: 'Peak Day',   value: peak },
        { label: 'Days ≥ 12',  value: daysOver12 },
      ]
    : [
        { label: 'Avg / Day', value: avg },
        { label: 'Peak Day',  value: peak },
        { label: 'Total',     value: total },
      ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-xs text-brand-blue text-shadow-hero hover:underline">← Admin</Link>
          <h1 className="text-2xl font-semibold text-white text-shadow-hero mt-0.5">Analytics</h1>
        </div>
        <div className="flex gap-2">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
              disabled={fetching}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                range === r ? 'bg-white text-charcoal' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {metric === 'dau' && (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
          <p className="text-xs text-white/80 text-shadow-hero">
            <span className="font-semibold text-white">Google Play target:</span> 12+ daily active users for 14 consecutive days.
            <span className="ml-2 font-semibold text-white">{daysOver12} of {range} days hit so far.</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value }, i) => (
          <AnimatedCard key={label} delay={i * 0.05}>
            <div className="rounded-2xl border border-steel/15 bg-white p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-charcoal">{value.toLocaleString()}</p>
              <p className="text-xs text-muted mt-0.5">{label}</p>
            </div>
          </AnimatedCard>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              metric === m.key ? 'bg-white text-charcoal' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <AnimatedCard>
        <div className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-steel mb-4">{activeMetric.label}</p>
          {fetching ? (
            <div className="h-52 flex items-center justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-steel/30 border-t-steel animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  labelStyle={{ fontWeight: 600, color: '#1f2937' }}
                />
                {metric === 'dau' && (
                  <ReferenceLine
                    y={12}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{ value: '12', position: 'right', fontSize: 10, fill: '#ef4444' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={activeMetric.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: activeMetric.color }}
                  activeDot={{ r: 5 }}
                  name={activeMetric.label}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </AnimatedCard>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 rounded bg-white/20 animate-pulse" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-2xl border border-steel/15 bg-white p-4 animate-pulse">
            <div className="h-6 w-1/2 mx-auto rounded bg-steel/10 mb-1" />
            <div className="h-3 w-2/3 mx-auto rounded bg-steel/10" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-steel/15 bg-white p-5 h-64 animate-pulse" />
    </div>
  )
}
