import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { getDocs, limit, query, where, type Query } from 'firebase/firestore'
import { Search as SearchIcon } from 'lucide-react'
import { queryTokens } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, EmptyState, ListRow, SkeletonList } from '@/components/ui'
import { controlClass } from '@/components/ui/input'
import { cols } from '@/lib/firestore'
import { cn, when } from '@/lib/utils'

interface Hit {
  key: string
  kind: string
  title: string
  meta: string
  to: string
  photo?: string | null
  score: number
}

async function hits<T extends { searchTokens: string[] }>(q: Query<T>, tokens: string[], map: (d: T) => Omit<Hit, 'score' | 'kind'>, kind: string): Promise<Hit[]> {
  const snap = await getDocs(query(q, where('searchTokens', 'array-contains-any', tokens), limit(10)))
  return snap.docs.map((d) => {
    const data = d.data()
    const score = tokens.filter((t) => data.searchTokens.includes(t)).length
    return { ...map(data), kind, score }
  })
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [draft, setDraft] = useState(q)
  const [seenQ, setSeenQ] = useState(q)
  if (seenQ !== q) {
    // URL changed (back button, header search): adopt the new query as the draft
    setSeenQ(q)
    setDraft(q)
  }

  const tokens = queryTokens(q)
  const results = useQuery({
    queryKey: ['search', tokens.join(' ')],
    enabled: tokens.length > 0,
    queryFn: async () => {
      const all = await Promise.all([
        hits(query(cols.users, where('profileComplete', '==', true), where('privacy.profile', '==', 'everyone')), tokens, (u) => ({ key: u.uid, title: u.displayName, meta: [u.department, u.bio].filter(Boolean).join(' · '), to: `/people/${u.uid}`, photo: u.photoURL }), 'People'),
        hits(cols.groups, tokens, (g) => ({ key: g.id, title: g.name, meta: `${g.category} · ${g.memberCount} members`, to: `/groups/${g.id}` }), 'Groups'),
        hits(cols.communities, tokens, (c) => ({ key: c.id, title: c.name, meta: `${c.category} · ${c.memberCount} members`, to: `/communities/${c.id}` }), 'Communities'),
        hits(cols.activities, tokens, (a) => ({ key: a.id, title: a.title, meta: `${when(a.start)} · ${a.location}`, to: `/happening/activities/${a.id}` }), 'Activities'),
        hits(cols.hangouts, tokens, (h) => ({ key: h.id, title: h.title, meta: `${when(h.start)} · ${h.venue}`, to: `/happening/hangouts/${h.id}` }), 'Hangouts'),
        hits(cols.events, tokens, (e) => ({ key: e.id, title: e.title, meta: `${when(e.start)} · ${e.venue}`, to: `/happening/events/${e.id}` }), 'Events'),
        hits(cols.teams, tokens, (t) => ({ key: t.id, title: t.name, meta: t.roles.map((r) => r.title).join(', '), to: `/teams/${t.id}` }), 'Teams'),
        hits(cols.rides, tokens, (r) => ({ key: r.id, title: `${r.from} → ${r.to}`, meta: when(r.start), to: `/rides/${r.id}` }), 'Rides'),
        hits(cols.tutors, tokens, (t) => ({ key: t.uid, title: t.name, meta: `Tutor · ₹${t.hourlyRate}/hr`, to: `/tutoring/${t.uid}`, photo: t.photo }), 'Tutors'),
      ])
      return all.flat().sort((a, b) => b.score - a.score)
    },
  })

  const grouped = (results.data ?? []).reduce<Record<string, Hit[]>>((acc, h) => {
    ;(acc[h.kind] ??= []).push(h)
    return acc
  }, {})

  return (
    <Page>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setParams(draft.trim() ? { q: draft.trim() } : {})
        }}
        className="relative mb-4"
      >
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search people, groups, events, rides…"
          aria-label="Search"
          enterKeyHint="search"
          className={cn(controlClass(), 'h-11 pl-9')}
        />
      </form>

      {!tokens.length ? (
        <EmptyState icon={SearchIcon} text="Try a name, a skill like “react”, a place like “Vijayawada”, or an interest." />
      ) : results.isLoading ? (
        <SkeletonList rows={5} />
      ) : !results.data?.length ? (
        <EmptyState icon={SearchIcon} text={`Nothing matched “${q}”.`} />
      ) : (
        <div className="flex flex-col gap-5">
          {Object.entries(grouped).map(([kind, list]) => (
            <section key={kind}>
              <h2 className="eyebrow mb-1.5">{kind}</h2>
              <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
                {list.map((h) => (
                  <ListRow key={h.key} to={h.to} leading={kind === 'People' || kind === 'Tutors' ? <Avatar name={h.title} seed={h.key} src={h.photo} size={32} /> : undefined} title={h.title} meta={h.meta} chevron />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Page>
  )
}
