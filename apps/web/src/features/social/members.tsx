import { useState } from 'react'
import { Link } from 'react-router'
import { Shield, UserMinus } from 'lucide-react'
import type { Community, Group } from '@frisbee/shared'
import { Avatar, Button, ListRow, StatusChip, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import type { Social } from '@/lib/firestore'
import { friendlyError, plural } from '@/lib/utils'
import { decideJoinRequest, removeMember, setMemberRole } from './api'
import { useJoinRequests, useMembers } from './hooks'

export function MembersTab({ kind, g, isStaff }: { kind: Social; g: Group | Community; isStaff: boolean }) {
  const me = useMe()
  const { toast } = useToast()
  const members = useMembers(kind, g.id)
  const requests = useJoinRequests(kind, g.id, isStaff)
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    try {
      await fn()
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {isStaff && requests.data.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2">Join requests</h2>
          <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
            {requests.data.map((r) => (
              <ListRow
                key={r.uid}
                leading={<Avatar name={r.name} seed={r.uid} src={r.photo} size={32} />}
                title={<Link to={`/people/${r.uid}`}>{r.name}</Link>}
                meta={r.message || 'No message'}
                trailing={
                  <div className="flex gap-1">
                    <Button size="sm" loading={busy === r.uid} onClick={() => run(r.uid, () => decideJoinRequest(kind, g, r.uid, true))}>
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => run(r.uid, () => decideJoinRequest(kind, g, r.uid, false))}>
                      Decline
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="eyebrow mb-2">{plural(g.memberCount, 'member')}</h2>
        <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
          {members.data.map((m) => (
            <ListRow
              key={m.uid}
              leading={
                <Link to={m.uid === me.uid ? '/me' : `/people/${m.uid}`}>
                  <Avatar name={m.name} seed={m.uid} src={m.photo} size={32} />
                </Link>
              }
              title={
                <span className="flex items-center gap-2">
                  <Link to={m.uid === me.uid ? '/me' : `/people/${m.uid}`}>{m.name}</Link>
                  {m.role !== 'member' && <StatusChip tone={m.role === 'owner' ? 'live' : 'info'}>{m.role === 'owner' ? 'Owner' : 'Moderator'}</StatusChip>}
                </span>
              }
              trailing={
                isStaff && m.uid !== me.uid && m.role !== 'owner' ? (
                  <div className="flex gap-1">
                    {g.ownerId === me.uid && (
                      <Button size="sm" variant="ghost" icon={<Shield className="size-4" />} onClick={() => run(m.uid, () => setMemberRole(kind, g, m.uid, m.role === 'mod' ? 'member' : 'mod'))}>
                        {m.role === 'mod' ? 'Demote' : 'Make mod'}
                      </Button>
                    )}
                    <Button size="sm" variant="danger" icon={<UserMinus className="size-4" />} aria-label="Remove" onClick={() => run(m.uid, () => removeMember(kind, g, m.uid))} />
                  </div>
                ) : undefined
              }
            />
          ))}
        </div>
      </section>
    </div>
  )
}
