import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { deleteDoc, query } from 'firebase/firestore'
import { useQuery } from '@tanstack/react-query'
import { getDoc } from 'firebase/firestore'
import type { Privacy } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Button, Card, ListRow, PageHeader, Select, useToast } from '@/components/ui'
import { Avatar } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { updatePrivacy } from '@/features/profile/api'
import { InstallRow } from '@/features/pwa/install'
import { useCollection } from '@/hooks/use-collection'
import { cols, doc, subs } from '@/lib/firestore'
import { friendlyError } from '@/lib/utils'
import { useTheme } from '@/features/theme/theme-context'

export default function SettingsPage() {
  const me = useMe()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [privacy, setPrivacy] = useState<Privacy>(me.privacy)
  const [busy, setBusy] = useState(false)
  const blocks = useCollection(query(subs.blocks(me.uid)), `blocks-list:${me.uid}`)

  const save = async () => {
    setBusy(true)
    try {
      await updatePrivacy(me.uid, privacy)
      toast('Privacy updated', 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader title="Settings" back="/me" />

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Privacy</h2>
        <Card className="flex flex-col gap-4">
          <Select label="Who can see your profile" value={privacy.profile} onChange={(e) => setPrivacy({ ...privacy, profile: e.target.value as Privacy['profile'] })}>
            <option value="everyone">Everyone on frisbee</option>
            <option value="connections">Only my connections</option>
            <option value="hidden">Hidden from search and matches</option>
          </Select>
          <Select label="Who can message you" value={privacy.messages} onChange={(e) => setPrivacy({ ...privacy, messages: e.target.value as Privacy['messages'] })}>
            <option value="everyone">Anyone</option>
            <option value="connections">Only connections</option>
          </Select>
          <Select label="Connection requests" value={privacy.requests} onChange={(e) => setPrivacy({ ...privacy, requests: e.target.value as Privacy['requests'] })}>
            <option value="everyone">Anyone can send</option>
            <option value="nobody">Nobody</option>
          </Select>
          <label className="flex items-center gap-3 text-body">
            <input type="checkbox" className="size-4 accent-brand-500" checked={privacy.showAvailability} onChange={(e) => setPrivacy({ ...privacy, showAvailability: e.target.checked })} />
            Show my availability on my profile
          </label>
          <Button loading={busy} onClick={save} className="self-start">
            Save
          </Button>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Blocked users</h2>
        {blocks.data.length === 0 ? (
          <p className="text-small text-ink-3">You haven't blocked anyone.</p>
        ) : (
          <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
            {blocks.data.map((b) => (
              <BlockedRow key={b.uid} uid={b.uid} onUnblock={() => deleteDoc(doc(subs.blocks(me.uid), b.uid))} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">App</h2>
        <Card>
          <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <div className="text-h3">Appearance</div>
              <p className="text-small text-ink-3">Choose the day or night theme.</p>
            </div>
            <div className="flex gap-1 rounded-sm border border-line p-1">
              <Button size="sm" variant={theme === 'light' ? 'primary' : 'ghost'} icon={<Sun className="size-4" />} onClick={() => setTheme('light')}>
                Day
              </Button>
              <Button size="sm" variant={theme === 'dark' ? 'primary' : 'ghost'} icon={<Moon className="size-4" />} onClick={() => setTheme('dark')}>
                Night
              </Button>
            </div>
          </div>
          <InstallRow />
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">About</h2>
        <Card className="flex items-center gap-3">
          <img src="/hello-world-80.png" alt="" width={40} height={40} className="rounded-sm" />
          <div className="text-small text-ink-2">
            <div className="text-h3 text-ink">frisbee</div>
            made with love by team Hello World
          </div>
        </Card>
      </section>
    </Page>
  )
}

function BlockedRow({ uid, onUnblock }: { uid: string; onUnblock: () => Promise<void> }) {
  const user = useQuery({ queryKey: ['user', uid], queryFn: async () => (await getDoc(doc(cols.users, uid))).data() ?? null })
  const name = user.data?.displayName ?? 'Student'
  return (
    <ListRow
      leading={<Avatar name={name} seed={uid} src={user.data?.photoURL} size={32} />}
      title={name}
      trailing={
        <Button size="sm" variant="secondary" onClick={onUnblock}>
          Unblock
        </Button>
      }
    />
  )
}
