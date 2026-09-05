import { BadgeCheck } from 'lucide-react'
import { thumb } from '@/lib/cloudinary'
import { cn, initials } from '@/lib/utils'

type Size = 24 | 32 | 40 | 56 | 96

interface AvatarProps {
  name: string
  src?: string | null
  seed?: string
  size?: Size
  verified?: boolean
  className?: string
}

// six muted tones, never brand orange — avatars must not compete with the primary action
const TONES = ['bg-[#E5E7EB] text-[#374151]', 'bg-[#DBEAFE] text-[#1E3A8A]', 'bg-[#FEF3C7] text-[#78350F]', 'bg-[#D1FAE5] text-[#064E3B]', 'bg-[#EDE9FE] text-[#4C1D95]', 'bg-[#FCE7F3] text-[#831843]']

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

const text: Record<Size, string> = { 24: 'text-[10px]', 32: 'text-[12px]', 40: 'text-[14px]', 56: 'text-[18px]', 96: 'text-[32px]' }

export function Avatar({ name, src, seed, size = 40, verified, className }: AvatarProps) {
  const url = thumb(src, size * 2)
  return (
    <span className={cn('relative inline-block shrink-0', className)} style={{ width: size, height: size }}>
      {url ? (
        <img src={url} alt="" width={size} height={size} className="size-full rounded-full object-cover" loading="lazy" />
      ) : (
        <span
          aria-hidden
          className={cn('flex size-full items-center justify-center rounded-full font-semibold', TONES[hash(seed ?? name) % TONES.length], text[size])}
        >
          {initials(name) || '?'}
        </span>
      )}
      {verified && size >= 40 && (
        <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-surface p-px" title="Verified student">
          <BadgeCheck className="size-4 fill-teal-600 text-white" />
        </span>
      )}
    </span>
  )
}
