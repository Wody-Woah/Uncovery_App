'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { supabase } from '@/lib/supabaseClient'
import Avatar from '@/components/Avatar'
import AnimatedCard from '@/components/AnimatedCard'

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const img = await createImageBitmap(await fetch(imageSrc).then((r) => r.blob()))
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas is empty')), 'image/jpeg', 0.92)
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile fields
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [heicConverting, setHeicConverting] = useState(false)

  // Crop modal
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  // Clean date fields
  const [cleanDate, setCleanDate] = useState('')
  const [showCleanDateCard, setShowCleanDateCard] = useState(false)
  const [cleanDateSaving, setCleanDateSaving] = useState(false)
  const [cleanDateSuccess, setCleanDateSuccess] = useState(false)
  const [cleanDateError, setCleanDateError] = useState<string | null>(null)

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
        .select('id, display_name, bio, avatar_url, clean_date, show_clean_date_card')
        .eq('id', user.id)
        .single()

      if (profile) {
        setDisplayName(profile.display_name ?? '')
        setBio(profile.bio ?? '')
        setAvatarUrl(profile.avatar_url ?? null)
        setCleanDate(profile.clean_date ?? '')
        setShowCleanDateCard(profile.show_clean_date_card ?? false)
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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be under 5MB.')
      return
    }

    setAvatarError(null)

    let blob: Blob = file
    if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      setHeicConverting(true)
      try {
        const heic2any = (await import('heic2any')).default
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
        blob = Array.isArray(converted) ? converted[0] : converted
      } catch {
        setAvatarError('Could not convert this photo. Please try a different image.')
        setHeicConverting(false)
        return
      }
      setHeicConverting(false)
    }

    const objectUrl = URL.createObjectURL(blob)
    setCropSrc(objectUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    // Reset input so the same file can be re-selected if needed
    e.target.value = ''
  }

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleCropConfirm() {
    if (!cropSrc || !croppedAreaPixels || !userId) return
    setAvatarUploading(true)
    setCropSrc(null)

    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels)
      const filePath = `${userId}/avatar.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) {
        setAvatarError('Upload failed. Please try again.')
        setAvatarUploading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId)

      setAvatarUrl(urlWithTimestamp)
    } catch {
      setAvatarError('Something went wrong. Please try again.')
    }

    setAvatarUploading(false)
  }

  async function handleAvatarDelete() {
    if (!userId) return
    setAvatarError(null)
    setAvatarUploading(true)

    await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`])

    await supabase
      .from('profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', userId)

    setAvatarUrl(null)
    setAvatarUploading(false)
  }

  async function handleCleanDateSave() {
    setCleanDateError(null)
    setCleanDateSuccess(false)
    setCleanDateSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        clean_date: cleanDate || null,
        show_clean_date_card: showCleanDateCard,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    setCleanDateSaving(false)
    if (error) {
      setCleanDateError(error.message)
    } else {
      setCleanDateSuccess(true)
    }
  }

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
    <>
      {/* Crop modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black">
          <div className="relative flex-1">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Zoom slider */}
          <div className="px-6 py-4 bg-black flex items-center gap-4">
            <span className="text-white/50 text-xs">–</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-steel"
            />
            <span className="text-white/50 text-xs">+</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-8 bg-black">
            <button
              onClick={() => setCropSrc(null)}
              className="flex-1 rounded-lg border border-white/20 py-3 text-white text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleCropConfirm}
              className="flex-1 rounded-lg bg-steel py-3 text-white text-sm font-medium"
            >
              Use Photo
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-brand-blue text-shadow-hero">Profile</h1>

        {/* Avatar card */}
        <AnimatedCard delay={0}>
        <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm flex flex-col items-center gap-4">
          <p className="text-xs uppercase tracking-widest text-steel self-start">Photo</p>

          {/* Avatar circle */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="relative group focus:outline-none"
            title="Change photo"
          >
            <Avatar avatarUrl={avatarUrl} displayName={displayName} size="xl" />
            {/* Camera overlay */}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {heicConverting && (
            <p className="text-xs text-muted">Converting photo…</p>
          )}
          {avatarUploading && (
            <p className="text-xs text-muted">Uploading…</p>
          )}
          {avatarError && (
            <p className="text-xs text-red-600">{avatarError}</p>
          )}
          {!avatarUploading && !avatarError && (
            <p className="text-xs text-muted">Tap your photo to change it</p>
          )}
          {avatarUrl && !avatarUploading && (
            <button
              onClick={handleAvatarDelete}
              className="text-xs text-red-500 hover:underline"
            >
              Remove photo
            </button>
          )}
        </div>
        </AnimatedCard>

        {/* Profile card */}
        <AnimatedCard delay={0.08}>
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
        </AnimatedCard>

        {/* Clean Date card */}
        <AnimatedCard delay={0.16}>
        <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
          <h2 className="text-xs uppercase tracking-widest text-steel mb-1">Clean Date</h2>
          <p className="text-sm text-muted mb-5">Track your sobriety and display a Days Clean card on your dashboard.</p>

          <div className="space-y-5">
            {cleanDateError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {cleanDateError}
              </div>
            )}
            {cleanDateSuccess && (
              <div className="rounded-lg bg-steel/10 border border-steel/20 px-4 py-3 text-sm text-steel font-medium">
                Saved.
              </div>
            )}

            <div>
              <label className={labelClass}>My Clean Date</label>
              <input
                type="date"
                value={cleanDate}
                onChange={(e) => { setCleanDate(e.target.value); setCleanDateSuccess(false) }}
                max={new Date().toISOString().split('T')[0]}
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-charcoal">Show on dashboard</p>
                <p className="text-xs text-muted mt-0.5">Display a Days Clean card on your home screen.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const next = !showCleanDateCard
                  setShowCleanDateCard(next)
                  setCleanDateSuccess(false)
                  await supabase
                    .from('profiles')
                    .update({ show_clean_date_card: next, updated_at: new Date().toISOString() })
                    .eq('id', userId)
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${showCleanDateCard ? 'bg-steel' : 'bg-steel/20'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${showCleanDateCard ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleCleanDateSave}
              disabled={cleanDateSaving}
              className="rounded-lg bg-steel px-5 py-2.5 text-white text-sm font-medium hover:bg-steel/90 transition-colors disabled:opacity-60"
            >
              {cleanDateSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        </AnimatedCard>

        {/* Security card */}
        <AnimatedCard delay={0.24}>
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
        </AnimatedCard>

        {/* Account card */}
        <AnimatedCard delay={0.32}>
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
        </AnimatedCard>

      </div>
    </>
  )
}
