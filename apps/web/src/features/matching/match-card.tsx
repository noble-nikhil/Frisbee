import { useState } from 'react'
import { Link } from 'react-router'
import { BadgeCheck } from 'lucide-react'
import { Avatar, Button, Card, MatchExplain, ScoreBar, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { sendConnectionRequest } from '@/features/connections/api'
import { friendlyError, yearLabel } from '@/lib/utils'
import type { Match } from './hooks'

type ConnectionState = 'none' | 'requested' | 'connected'

interface MatchCardProps {
  match: Match
  state: ConnectionState
  onSkip?: (uid: string) => void
  compact?: boolean
}

export function MatchCard({ match, state, onSkip, compact }: MatchCardProps) {
  const me = useMe()
  const { toast } = useToast()
  const [local, setLocal] = useState<ConnectionState>(state)
  const [busy, setBusy] = useState(false)
  const u = match.user

  const connect = async () => {
    setBusy(true)
    try {
      await sendConnectionRequest(me, u)
      setLocal('requested')
      toast(`Request sent to ${u.displayName}`, 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  // Parent data wins after a request is accepted; otherwise the optimistic local
  // state keeps the button responsive while the Firestore query catches up.
  const status: ConnectionState = state === 'connected' ? 'connected' : local === 'requested' ? 'requested' : state

  return (
    <Card tight={compact} className={compact ? 'w-60 shrink-0 snap-start' : ''}>
      <div className="flex items-start gap-3">
        <Link to={`/people/${u.uid}`}>
          <Avatar name={u.displayName} seed={u.uid} src={u.photoURL} size={compact ? 40 : 56} verified={u.roles.verifiedStudent} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/people/${u.uid}`} className="flex items-center gap-1 truncate text-h3 hover:underline">
            {u.displayName}
            {u.roles.verifiedStudent && compact && <BadgeCheck className="size-4 shrink-0 fill-teal-600 text-white" />}
          </Link>
          <p className="truncate text-small text-ink-2">
            {u.department}
            {u.year ? ` · ${yearLabel(u.year)}` : ''}
          </p>
        </div>
        {!compact && <span className="text-h3 tabular-nums">{match.score}%</span>}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <ScoreBar score={match.score} />
        {compact && <span className="text-small font-semibold tabular-nums">{match.score}%</span>}
      </div>
      <MatchExplain shared={match.shared} max={compact ? 1 : 2} className="mt-2" />
      <div className="mt-3 flex gap-2">
        {status === 'connected' ? (
          <Link to={`/people/${u.uid}`} className="flex-1">
            <Button size="sm" variant="secondary" full>
              Connected
            </Button>
          </Link>
        ) : (
          <Button size="sm" full={compact} loading={busy} disabled={status === 'requested' || u.privacy.requests === 'nobody'} onClick={connect}>
            {status === 'requested' ? 'Requested' : 'Connect'}
          </Button>
        )}
        {onSkip && !compact && (
          <Button size="sm" variant="ghost" onClick={() => onSkip(u.uid)}>
            Skip
          </Button>
        )}
      </div>
    </Card>
  )
}
