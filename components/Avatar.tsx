import Image from 'next/image'

const sizes = {
  sm: 32,
  md: 40,
  lg: 96,
}

interface AvatarProps {
  avatarUrl?: string | null
  displayName?: string | null
  size?: keyof typeof sizes
}

export default function Avatar({ avatarUrl, displayName, size = 'md' }: AvatarProps) {
  const px = sizes[size]

  const initials = (displayName ?? '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  return (
    <div
      className="rounded-full overflow-hidden bg-steel flex items-center justify-center shrink-0"
      style={{ width: px, height: px }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={displayName ?? 'Avatar'}
          width={px}
          height={px}
          className="w-full h-full object-cover"
        />
      ) : (
        <span
          className="font-semibold text-white leading-none"
          style={{ fontSize: px * 0.35 }}
        >
          {initials}
        </span>
      )}
    </div>
  )
}
