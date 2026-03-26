'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ProfilePage() {
  const router = useRouter()

  // Profile fields
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Password fields
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, bio')
        .eq('id', user.id)
        .single()

      if (profile) {
        setDisplayName(profile.display_name ?? '')
        setBio(profile.bio ?? '')
      } else {
        const defaultName = user.email?.split('@')[0] ?? 'User'
        await supabase.from('profiles').upsert({
          id: user.id,
          display_name: defaultName,
          updated_at: new Date().toISOString(),
        })
        setDisplayName(defaultName)
      }

      setProfileLoading(false)
    }

    init()
  }, [router])

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(false)
    setProfileSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    setProfileSaving(false)
    if (error) {
      setProfileError(error.message)
    } else {
      setProfileSuccess(true)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  if (profileLoading) {
    return (
      <div className="py-20 text-center text-white font-semibold text-sm text-shadow-hero">
        Loading…
      </div>
    )
  }

  const inputClass =
    'w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30'
  const labelClass = 'block text-xs uppercase tracking-widest text-steel mb-2'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand-blue text-shadow-hero">Profile</h1>

      {/* Profile card */}
      <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
        <h2 className="text-xs uppercase tracking-widest text-steel mb-5">Your Profile</h2>

        <form onSubmit={handleProfileSave} className="space-y-5">
          {profileError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="rounded-lg bg-steel/10 border border-steel/20 px-4 py-3 text-sm text-steel font-medium">
              Profile saved.
            </div>
          )}

          <div>
            <label className={labelClass}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setProfileSuccess(false) }}
              required
              placeholder="Your name"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => { setBio(e.target.value); setProfileSuccess(false) }}
              rows={3}
              placeholder="A little about you…"
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-lg bg-steel px-5 py-2.5 text-white text-sm font-medium hover:bg-steel/90 transition-colors disabled:opacity-60"
          >
            {profileSaving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Security card */}
      <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
        <h2 className="text-xs uppercase tracking-widest text-steel mb-5">Security</h2>

        <form onSubmit={handlePasswordChange} className="space-y-5">
          {passwordError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-lg bg-steel/10 border border-steel/20 px-4 py-3 text-sm text-steel font-medium">
              Password updated.
            </div>
          )}

          <div>
            <label className={labelClass}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordSuccess(false); setPasswordError(null) }}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordSuccess(false); setPasswordError(null) }}
              placeholder="Repeat new password"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-lg bg-steel px-5 py-2.5 text-white text-sm font-medium hover:bg-steel/90 transition-colors disabled:opacity-60"
          >
            {passwordSaving ? 'Updating…' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
        <h2 className="text-xs uppercase tracking-widest text-steel mb-5">Account</h2>
        <p className="text-sm text-muted mb-4">
          To request deletion of your account and all associated data, tap the link below.
        </p>
        <a
          href="/delete-account"
          className="text-sm text-sunrise hover:underline"
        >
          Delete my account →
        </a>
      </div>

    </div>
  )
}
