import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface SectionProps {
  title: string
  to?: string
  linkLabel?: string
  children: ReactNode
}

/** Home-style section: uppercase eyebrow + optional "See all" link. */
export function Section({ title, to, linkLabel = 'See all', children }: SectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="eyebrow">{title}</h2>
        {to && (
          <Link to={to} className="text-small font-semibold text-brand-700 hover:underline">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
