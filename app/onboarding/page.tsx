'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

import { urlBase64ToUint8Array, localToUtc, formatHour, REMINDER_LOCAL_HOURS } from '@/lib/pushUtils'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [cleanDate, setCleanDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)

  const [notifSupported, setNotifSupported] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [selectedLocalHour, setSelectedLocalHour] = useState(9)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: flags } = await supabase
        .from('user_flags')
        .select('has_seen_onboarding')
        .eq('user_id', user.id)
        .single()

      if (flags?.has_seen_onboarding) {
        router.push('/dashboard')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, clean_date')
        .eq('id', user.id)
        .single()

      if (profile?.display_name) setDisplayName(profile.display_name)
      if (profile?.clean_date) setCleanDate(profile.clean_date)

      const supported =
        typeof window !== 'undefined' &&
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window
      setNotifSupported(supported)
      if (supported) setNotifPermission(Notification.permission)

      setUserId(user.id)
      setReady(true)
    }
    init()
  }, [router])

  async function completeOnboarding() {
    if (!userId) return
    await supabase
      .from('user_flags')
      .update({ has_seen_onboarding: true })
      .eq('user_id', userId)
    window.location.href = '/dashboard'
  }

  async function handleStep1Continue() {
    if (!userId || saving) return
    setSaving(true)
    if (displayName.trim()) {
      await supabase
        .from('profiles')
        .update({ display_name: displayName.trim(), updated_at: new Date().toISOString() })
        .eq('id', userId)
    }
    setSaving(false)
    setStep(2)
  }

  async function handleStep2Continue() {
    if (!userId || saving) return
    setSaving(true)
    if (cleanDate) {
      await supabase
        .from('profiles')
        .update({ clean_date: cleanDate, show_clean_date_card: true, updated_at: new Date().toISOString() })
        .eq('id', userId)
    }
    setSaving(false)
    setStep(3)
  }

  async function handleEnableNotifications() {
    if (notifLoading || !userId) return
    setNotifLoading(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      setNotifPermission(permission)
      if (permission !== 'granted') { setNotifLoading(false); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })

      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ subscription: sub.toJSON(), reminderHour: localToUtc(selectedLocalHour) }),
      })
      setNotifEnabled(true)
    } catch (err) {
      console.error('Notification enable error:', err)
    }
    setNotifLoading(false)
  }

  async function handleTimeChange(newLocalHour: number) {
    setSelectedLocalHour(newLocalHour)
    if (!userId) return
    await supabase
      .from('push_subscriptions')
      .update({ reminder_hour: localToUtc(newLocalHour) })
      .eq('user_id', userId)
  }

  const today = new Date().toISOString().split('T')[0]

  if (!ready) {
    return (
      <div className="space-y-5 py-4">
        <div className="flex justify-center gap-2">
          <div className="h-2 w-2 rounded-full bg-white/60" />
          <div className="h-2 w-2 rounded-full bg-white/25" />
          <div className="h-2 w-2 rounded-full bg-white/25" />
        </div>
        <div className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-4 animate-pulse">
          <div className="space-y-2 text-center">
            <div className="h-3 w-16 rounded bg-steel/10 mx-auto" />
            <div className="h-5 w-48 rounded bg-steel/10 mx-auto" />
            <div className="h-3 w-64 rounded bg-steel/10 mx-auto" />
          </div>
          <div className="h-10 w-full rounded-lg bg-steel/10" />
          <div className="h-11 w-full rounded-xl bg-steel/10" />
          <div className="h-8 w-full rounded-xl bg-steel/10" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 py-4">
      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${
              s === step ? 'bg-white' : s < step ? 'bg-white/60' : 'bg-white/25'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-5">
          <div className="text-center space-y-1.5">
            <p className="text-xs uppercase tracking-widest text-steel">Step 1 of 3</p>
            <h2 className="text-xl font-semibold text-charcoal">What should we call you?</h2>
            <p className="text-sm text-muted leading-relaxed">
              This is how your name will appear to others in groups.
            </p>
          </div>

          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStep1Continue()}
            placeholder="Your first name or nickname"
            autoFocus
            className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30"
          />

          <div className="space-y-2">
            <button
              onClick={handleStep1Continue}
              disabled={saving}
              className="w-full rounded-xl bg-steel px-4 py-3 text-sm font-medium text-white hover:bg-steel/90 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Continue'}
            </button>
            <button
              onClick={() => setStep(2)}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-muted hover:text-charcoal transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-5">
          <div className="text-center space-y-1.5">
            <p className="text-xs uppercase tracking-widest text-steel">Step 2 of 3</p>
            <h2 className="text-xl font-semibold text-charcoal">Do you have a sobriety date?</h2>
            <p className="text-sm text-muted leading-relaxed">
              If you do, we&apos;ll show a Days Clean counter on your home screen — a daily reminder of how far you&apos;ve come.
            </p>
          </div>

          <div className="space-y-1.5">
            <input
              type="date"
              value={cleanDate}
              onChange={(e) => setCleanDate(e.target.value)}
              max={today}
              className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal focus:outline-none focus:ring-2 focus:ring-steel/30"
            />
            <p className="text-xs text-muted">You can always add or change this in your profile.</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleStep2Continue}
              disabled={saving}
              className="w-full rounded-xl bg-steel px-4 py-3 text-sm font-medium text-white hover:bg-steel/90 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Continue'}
            </button>
            <button
              onClick={() => setStep(3)}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-muted hover:text-charcoal transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-5">
          <div className="text-center space-y-1.5">
            <p className="text-xs uppercase tracking-widest text-steel">Step 3 of 3</p>
            <h2 className="text-xl font-semibold text-charcoal">Stay on track</h2>
            <p className="text-sm text-muted leading-relaxed">
              Get a gentle daily reminder to read your devotion. You can change this anytime in Settings.
            </p>
          </div>

          {!notifSupported ? (
            <div className="space-y-4">
              <p className="text-sm text-muted text-center">
                Push notifications aren&apos;t available in this browser. On iPhone, add the app to your Home Screen first — then enable reminders in Settings.
              </p>
              <button
                onClick={completeOnboarding}
                className="w-full rounded-xl bg-steel px-4 py-3 text-sm font-medium text-white hover:bg-steel/90 transition-colors"
              >
                Go to App
              </button>
            </div>
          ) : notifPermission === 'denied' ? (
            <div className="space-y-4">
              <p className="text-sm text-muted text-center">
                Notifications are blocked in your browser settings. You can enable them later from the Settings page.
              </p>
              <button
                onClick={completeOnboarding}
                className="w-full rounded-xl bg-steel px-4 py-3 text-sm font-medium text-white hover:bg-steel/90 transition-colors"
              >
                Go to App
              </button>
            </div>
          ) : notifEnabled ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-steel/10 border border-steel/20 px-4 py-3 text-sm text-steel font-medium text-center">
                Daily reminders are on ✓
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-steel mb-2">Reminder Time</label>
                <select
                  value={selectedLocalHour}
                  onChange={(e) => handleTimeChange(Number(e.target.value))}
                  className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-steel/30"
                >
                  {REMINDER_LOCAL_HOURS.map((h) => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
                <p className="text-xs text-muted mt-1.5">Times shown in your local timezone.</p>
              </div>
              <button
                onClick={completeOnboarding}
                className="w-full rounded-xl bg-steel px-4 py-3 text-sm font-medium text-white hover:bg-steel/90 transition-colors"
              >
                Go to App
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-steel mb-2">What time works best?</label>
                <select
                  value={selectedLocalHour}
                  onChange={(e) => setSelectedLocalHour(Number(e.target.value))}
                  className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-steel/30"
                >
                  {REMINDER_LOCAL_HOURS.map((h) => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
                <p className="text-xs text-muted mt-1.5">Times shown in your local timezone.</p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleEnableNotifications}
                  disabled={notifLoading}
                  className="w-full rounded-xl bg-steel px-4 py-3 text-sm font-medium text-white hover:bg-steel/90 transition-colors disabled:opacity-60"
                >
                  {notifLoading ? 'Enabling…' : 'Enable Daily Reminders'}
                </button>
                <button
                  onClick={completeOnboarding}
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-muted hover:text-charcoal transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
