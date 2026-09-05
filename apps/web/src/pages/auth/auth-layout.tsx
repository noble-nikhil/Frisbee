import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Credit } from '@/components/layout/credit'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-8">
      <Link to="/" aria-label="frisbee" className="mb-6">
        <img src="/icons/icon-192.png" alt="" width={56} height={56} className="rounded-md" />
      </Link>
      <div className="w-full max-w-[400px] rounded-md border border-line bg-surface p-6 shadow-card">
        <h1 className="text-h1">{title}</h1>
        {subtitle && <p className="mt-1 text-body text-ink-2">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
      <Credit className="mt-8" />
    </div>
  )
}

export function GoogleGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
    </svg>
  )
}
