'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import AnimatedCard from '@/components/AnimatedCard'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array(Array.from(rawData, (char) => char.charCodeAt(0)))
}

function offsetHours() {
  return Math.round(new Date().getTimezoneOffset() / 60)
}
function localToUtc(localHour: number) {
  return (localHour + offsetHours() + 24) % 24
}
function utcToLocal(utcHour: number) {
  return (utcHour - offsetHours() + 24) % 24
}
function formatHour(h: number) {
  const d = new Date()
  d.setHours(h, 0, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const REMINDER_LOCAL_HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM – 9 PM

export default function SettingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [showJourneyCard, setShowJourneyCard] = useState(true)
  const [showCleanDateCard, setShowCleanDateCard] = useState(false)
  const [hasCleanDate, setHasCleanDate] = useState(false)
  const [loading, setLoading] = useState(true)

  const [notifSupported, setNotifSupported] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [selectedLocalHour, setSelectedLocalHour] = useState(9)

  // PWA install
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select('show_journey_card, show_clean_date_card, clean_date')
        .eq('id', user.id)
        .single()

      if (data) {
        setShowJourneyCard(data.show_journey_card ?? true)
        setShowCleanDateCard(data.show_clean_date_card ?? false)
        setHasCleanDate(!!data.clean_date)
      }
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent))

    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    if (!userId) return

    const supported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window

    setNotifSupported(supported)
    if (!supported) return

    setNotifPermission(Notification.permission)

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setNotifEnabled(!!sub)

      if (sub) {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('reminder_hour')
          .eq('user_id', userId)
          .eq('endpoint', sub.endpoint)
          .single()
        if (data) setSelectedLocalHour(utcToLocal(data.reminder_hour))
      }
    })
  }, [userId])

  async function saveField(field: string, value: boolean) {
    if (!userId) return
    await supabase
      .from('profiles')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', userId)
  }

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      setIsInstalled(true)
    }
  }

  async function handleTimeChange(newLocalHour: number) {
    setSelectedLocalHour(newLocalHour)
    if (!userId) return
    await supabase
      .from('push_subscriptions')
      .update({ reminder_hour: localToUtc(newLocalHour) })
      .eq('user_id', userId)
  }

  async function handleNotificationToggle() {
    if (notifLoading || !userId) return
    setNotifLoading(true)

    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      if (notifEnabled) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          const { data: { session } } = await supabase.auth.getSession()
          await fetch('/api/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
        }
        setNotifEnabled(false)
      } else {
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
      }
    } catch (err) {
      console.error('Notification toggle error:', err)
    }

    setNotifLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-28 rounded bg-white/20 animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-4 animate-pulse">
            <div className="h-3 w-24 rounded bg-steel/10" />
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-steel/10" />
                <div className="h-3 w-48 rounded bg-steel/10" />
              </div>
              <div className="h-6 w-11 rounded-full bg-steel/10" />
            </div>
          </div>
        ))}
        <div className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-4 animate-pulse">
          <div className="h-3 w-12 rounded bg-steel/10" />
          <div className="flex items-center justify-between py-1">
            <div className="h-3.5 w-28 rounded bg-steel/10" />
            <div className="h-3 w-3 rounded bg-steel/10" />
          </div>
          <div className="border-t border-steel/10" />
          <div className="flex items-center justify-between py-1">
            <div className="h-3.5 w-32 rounded bg-steel/10" />
            <div className="h-3 w-3 rounded bg-steel/10" />
          </div>
        </div>
      </div>
    )
  }

  const toggleClass = (on: boolean, disabled = false) =>
    `relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${on ? 'bg-steel' : 'bg-steel/20'}`

  const knobClass = (on: boolean) =>
    `inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-blue text-shadow-hero text-center">Settings</h1>

      {/* Dashboard Cards */}
      <AnimatedCard delay={0}>
      <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
        <h2 className="text-xs uppercase tracking-widest text-steel mb-1">Dashboard Cards</h2>
        <p className="text-sm text-muted mb-5">Choose which cards appear on your home screen.</p>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-charcoal">Your Journey</p>
              <p className="text-xs text-muted mt-0.5">Streak, days read, and monthly grid.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const next = !showJourneyCard
                setShowJourneyCard(next)
                await saveField('show_journey_card', next)
              }}
              className={toggleClass(showJourneyCard)}
            >
              <span className={knobClass(showJourneyCard)} />
            </button>
          </div>

          <div className="border-t border-steel/10" />

          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-charcoal">Days Clean</p>
              <p className="text-xs text-muted mt-0.5">
                {hasCleanDate
                  ? 'Your days clean counter.'
                  : <>Set your clean date in <Link href="/profile" className="text-steel hover:underline">Profile</Link> first.</>}
              </p>
            </div>
            <button
              type="button"
              disabled={!hasCleanDate}
              onClick={async () => {
                if (!hasCleanDate) return
                const next = !showCleanDateCard
                setShowCleanDateCard(next)
                await saveField('show_clean_date_card', next)
              }}
              className={toggleClass(showCleanDateCard, !hasCleanDate)}
            >
              <span className={knobClass(showCleanDateCard)} />
            </button>
          </div>
        </div>
      </div>
      </AnimatedCard>

      {/* Notifications */}
      <AnimatedCard delay={0.08}>
      <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
        <h2 className="text-xs uppercase tracking-widest text-steel mb-1">Notifications</h2>
        <p className="text-sm text-muted mb-5">Get a daily reminder to read your devotion.</p>

        {!notifSupported ? (
          <p className="text-sm text-muted">
            Push notifications are not supported in this browser. On iPhone, add this app to your Home Screen first.
          </p>
        ) : notifPermission === 'denied' ? (
          <p className="text-sm text-muted">
            Notifications are blocked. Enable them in your browser or device settings, then return here.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-charcoal">Daily Reminder</p>
                <p className="text-xs text-muted mt-0.5">A nudge to read your devotion each day.</p>
              </div>
              <button
                type="button"
                onClick={handleNotificationToggle}
                disabled={notifLoading}
                className={toggleClass(notifEnabled, notifLoading)}
              >
                <span className={knobClass(notifEnabled)} />
              </button>
            </div>

            {notifEnabled && (
              <div className="border-t border-steel/10 pt-4">
                <label className="block text-xs uppercase tracking-widest text-steel mb-2">
                  Reminder Time
                </label>
                <select
                  value={selectedLocalHour}
                  onChange={(e) => handleTimeChange(Number(e.target.value))}
                  className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-steel/30"
                >
                  {REMINDER_LOCAL_HOURS.map((h) => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
                <p className="text-xs text-muted mt-2">Times shown in your local timezone.</p>
              </div>
            )}
          </div>
        )}
      </div>
      </AnimatedCard>

      {/* Install App */}
      <AnimatedCard delay={0.16}>
      <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
        <h2 className="text-xs uppercase tracking-widest text-steel mb-1">Install App</h2>
        <p className="text-sm text-muted mb-5">Add Uncovery to your home screen for the best experience.</p>

        {isInstalled ? (
          <p className="text-sm text-steel font-medium">Already installed ✓</p>
        ) : isIOS ? (
          <ol className="space-y-3 text-sm text-charcoal">
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-steel/10 text-xs font-semibold text-steel">1</span>
              <span>Tap the <strong>...</strong> button to the right of the address bar.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-steel/10 text-xs font-semibold text-steel">2</span>
              <span>Tap <strong>Share</strong> in the menu that appears.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-steel/10 text-xs font-semibold text-steel">3</span>
              <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-steel/10 text-xs font-semibold text-steel">4</span>
              <span>Tap <strong>Add</strong> in the top-right corner.</span>
            </li>
          </ol>
        ) : installPrompt ? (
          <button
            type="button"
            onClick={handleInstall}
            className="w-full rounded-xl bg-steel px-4 py-3 text-sm font-medium text-white hover:bg-steel/90 transition-colors"
          >
            Add to Home Screen
          </button>
        ) : (
          <p className="text-sm text-muted">
            Open this page in Chrome on Android, or Safari on iPhone to install the app.
          </p>
        )}
      </div>
      </AnimatedCard>

      {/* Legal */}
      <AnimatedCard delay={0.24}>
      <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
        <h2 className="text-xs uppercase tracking-widest text-steel mb-4">Legal</h2>
        <div className="space-y-1">
          <Link href="/privacy" className="flex items-center justify-between py-2 text-sm text-charcoal hover:text-steel transition-colors">
            Privacy Policy
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-steel/40"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
          <div className="border-t border-steel/10" />
          <Link href="/terms" className="flex items-center justify-between py-2 text-sm text-charcoal hover:text-steel transition-colors">
            Terms of Service
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-steel/40"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        </div>
      </div>
      </AnimatedCard>
    </div>
  )
}
