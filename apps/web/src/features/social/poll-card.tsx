import { useState } from 'react'
import { BarChart3, Lock } from 'lucide-react'
import type { Poll } from '@frisbee/shared'
import { Button, Card, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { cn, friendlyError, timeAgo } from '@/lib/utils'
import { closePoll, vote } from './api'
import { useMyVote } from './hooks'
import { useNow } from '@/hooks/use-now'

export function PollCard({ communityId, poll, isMember, canModerate }: { communityId: string; poll: Poll; isMember: boolean; canModerate: boolean }) {
  const me = useMe()
  const { toast } = useToast()
  const mine = useMyVote(communityId, poll.id, me.uid)
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const now = useNow()
  const closed = !!poll.closesAt && poll.closesAt.toMillis() <= now
  const voted = !!mine.data
  const showResults = voted || closed || !isMember

  const toggle = (id: string) =>
    setPicked((p) => (poll.multi ? (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]) : [id]))

  const submit = async () => {
    setBusy(true)
    try {
      await vote(communityId, poll.id, me.uid, picked)
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <BarChart3 className="mt-0.5 size-4 shrink-0 text-ink-3" />
        <div className="min-w-0 flex-1">
          <h3 className="text-h3">{poll.question}</h3>
          <p className="text-micro text-ink-3">
            {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'} · {poll.multi ? 'multiple choice' : 'single choice'}
            {poll.anonymous ? ' · anonymous' : ''} · {timeAgo(poll.createdAt)}
            {closed && (
              <span className="ml-1 inline-flex items-center gap-0.5">
                <Lock className="size-3" /> closed
              </span>
            )}
          </p>
        </div>
        {canModerate && !closed && (
          <Button size="sm" variant="ghost" onClick={() => closePoll(communityId, poll.id)}>
            Close
          </Button>
        )}
      </div>
      <ul className="flex flex-col gap-1.5">
        {poll.options.map((o) => {
          const pct = poll.totalVotes ? Math.round((o.count / poll.totalVotes) * 100) : 0
          const chosen = mine.data?.optionIds.includes(o.id)
          if (showResults)
            return (
              <li key={o.id} className="relative overflow-hidden rounded-sm border border-line">
                <div className="absolute inset-y-0 left-0 bg-teal-50" style={{ width: `${pct}%` }} aria-hidden />
                <div className="relative flex items-center justify-between px-3 py-2 text-small">
                  <span className={cn(chosen && 'font-semibold text-teal-700')}>{o.text}</span>
                  <span className="tabular-nums text-ink-2">{pct}%</span>
                </div>
              </li>
            )
          const on = picked.includes(o.id)
          return (
            <li key={o.id}>
              <button
                type="button"
                role={poll.multi ? 'checkbox' : 'radio'}
                aria-checked={on}
                onClick={() => toggle(o.id)}
                className={cn('flex w-full items-center gap-2 rounded-sm border px-3 py-2 text-left text-small transition-colors', on ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-line-strong')}
              >
                <span className={cn('size-3.5 rounded-full border', on ? 'border-brand-500 bg-brand-500' : 'border-line-strong', poll.multi && 'rounded-sm')} aria-hidden />
                {o.text}
              </button>
            </li>
          )
        })}
      </ul>
      {!showResults && (
        <Button size="sm" className="self-start" disabled={!picked.length} loading={busy} onClick={submit}>
          Vote
        </Button>
      )}
    </Card>
  )
}
