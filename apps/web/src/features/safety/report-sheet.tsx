import { useState } from 'react'
import { REPORT_REASONS, type Report, type ReportReason } from '@frisbee/shared'
import { Button, Select, Sheet, Textarea, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { add, cols, now } from '@/lib/firestore'
import { friendlyError } from '@/lib/utils'

const LABELS: Record<ReportReason, string> = {
  spam: 'Spam or ads',
  harassment: 'Harassment or bullying',
  inappropriate: 'Inappropriate content',
  impersonation: 'Impersonation',
  scam: 'Scam or fraud',
  other: 'Something else',
}

interface ReportSheetProps {
  open: boolean
  onClose: () => void
  target: Report['target']
}

export function ReportSheet({ open, onClose, target }: ReportSheetProps) {
  const me = useMe()
  const { toast } = useToast()
  const [reason, setReason] = useState<ReportReason>('spam')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await add(cols.reports, {
        reporterId: me.uid,
        target,
        reason,
        details: details.trim(),
        status: 'open',
        action: null,
        reviewerId: null,
        createdAt: now(),
      })
      toast('Report sent. Thanks for keeping frisbee safe.', 'success')
      onClose()
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Report"
      description={target.label}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={submit}>
            Send report
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
          {REPORT_REASONS.map((r) => (
            <option key={r} value={r}>
              {LABELS[r]}
            </option>
          ))}
        </Select>
        <Textarea label="Details" hint="Optional, but it helps the moderators." value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} />
      </div>
    </Sheet>
  )
}
