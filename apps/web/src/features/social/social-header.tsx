import { useState } from 'react'
import { Link } from 'react-router'
import { LogOut, MessageSquare } from 'lucide-react'
import type { Community, Group } from '@frisbee/shared'
import { Button, StatusChip, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import type { Social } from '@/lib/firestore'
import { friendlyError, plural } from '@/lib/utils'
import { join, leave, requestToJoin } from './api'
import { useMyJoinRequest } from './hooks'

export function SocialHeader({ kind, g }: { kind: Social; g: Group | Community }) {
  const me = useMe()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const isMember = g.memberIds.includes(me.uid)
  const myRequest = useMyJoinRequest(kind, g.id, me.uid)
  const approved = myRequest.data?.status === 'approved'
  const pending = myRequest.data?.status === 'pending'

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true)
    try {
      await fn()
      if (ok) toast(ok, 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone="closed">{g.category}</StatusChip>
          {g.visibility !== 'public' && <StatusChip tone="pending">Request to join</StatusChip>}
        </div>
        <h1 className="mt-2 text-h1">{g.name}</h1>
        <p className="mt-1 text-small text-ink-2">{plural(g.memberCount, 'member')}</p>
        <p className="mt-2 text-body text-ink-2 whitespace-pre-line">{g.description}</p>
      </div>
      <div className="flex gap-2">
        {isMember ? (
          <>
            <Link to={`/messages/${g.threadId}`} className="flex-1">
              <Button full variant="secondary" icon={<MessageSquare className="size-4" />}>
                Group chat
              </Button>
            </Link>
            {g.ownerId !== me.uid && (
              <Button variant="ghost" icon={<LogOut className="size-4" />} loading={busy} onClick={() => act(() => leave(kind, g, me), `Left ${g.name}`)}>
                Leave
              </Button>
            )}
          </>
        ) : g.visibility === 'public' || approved ? (
          <Button full loading={busy} onClick={() => act(() => join(kind, g, me), `Welcome to ${g.name}`)}>
            Join
          </Button>
        ) : (
          <Button full variant={pending ? 'secondary' : 'primary'} disabled={pending} loading={busy} onClick={() => act(() => requestToJoin(kind, g, me), 'Request sent')}>
            {pending ? 'Requested' : 'Request to join'}
          </Button>
        )}
      </div>
    </div>
  )
}
