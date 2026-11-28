import { useEffect, useRef, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ErrorState, apiErrorMessage } from '@/components/common/detail'
import { formatCount } from '@/lib/format'
import type { ApiResponse } from '@/services/api.service'
import { Field, Note, TextInput } from '@/components/forms/editor/fields'

interface Preview { title: string; message: string; audience_label: string; user_count: number }

interface NotifyDialogProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  loadPreview: () => Promise<ApiResponse<Preview>>
  send: (data: { title: string; message: string }) => Promise<ApiResponse<{ sent: number; failed: number; total: number }>>
}

/** Full page: check the audience and the wording, then send the push notification. */
export function NotifyDialog({ open, onClose, title, description, loadPreview, send }: NotifyDialogProps) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [heading, setHeading] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const loadRef = useRef(loadPreview)
  loadRef.current = loadPreview

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true); setLoadError(null); setPreview(null); setFailure(null)
    loadRef.current()
      .then((res) => {
        if (!alive) return
        if (!res.success || !res.data) { setLoadError(res.message || 'Failed to load notification preview'); return }
        setPreview(res.data)
        setHeading(res.data.title)
        setMessage(res.data.message)
      })
      .catch((e) => { if (alive) setLoadError(apiErrorMessage(e, 'Failed to load notification preview')) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [open, tick])

  const users = preview?.user_count ?? 0
  const ready = !!preview && users > 0 && !!heading.trim() && !!message.trim() && !sending

  const submit = async () => {
    if (!ready) return
    setSending(true); setFailure(null)
    try {
      const res = await send({ title: heading.trim(), message: message.trim() })
      if (!res.success) throw new Error(res.message || 'Failed to send notification')
      const { sent = 0, failed = 0 } = res.data ?? {}
      toast.success(`Notification sent to ${sent} user${sent === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}`)
      onClose()
    } catch (e) {
      setFailure(apiErrorMessage(e, 'Failed to send notification'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !sending) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-3 rounded-xl border border-border bg-card p-5" role="status" aria-label="Loading">
            <Skeleton className="h-4 w-48" /><Skeleton className="h-9 w-full" /><Skeleton className="h-20 w-full" />
          </div>
        ) : loadError ? (
          <ErrorState title="The preview could not be loaded" message={loadError} onRetry={() => setTick((t) => t + 1)} />
        ) : (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card">
            <Note tone={users === 0 ? 'warning' : 'info'}>
              <p><span className="font-medium">Target Audience:</span> {preview?.audience_label || 'Unknown'}</p>
              <p><span className="font-medium">Users:</span> {users === 0 ? 'nobody matches this audience, so there is nothing to send.' : `${formatCount(users)} user${users === 1 ? '' : 's'} will receive this notification`}</p>
            </Note>
            <Field id="notify-title" label="Title" required counter={{ value: heading.length, max: 200 }}>
              {(c) => <TextInput {...c} value={heading} onChange={(e) => setHeading(e.target.value)} maxLength={200} disabled={sending} placeholder="Notification title" />}
            </Field>
            <Field id="notify-message" label="Message" required counter={{ value: message.length, max: 1000 }}>
              {(c) => <Textarea {...c} rows={4} className="bg-card" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} disabled={sending} placeholder="Notification message" />}
            </Field>
            {failure && <Note tone="danger">{failure}</Note>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" className="bg-card" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button onClick={submit} disabled={!ready}>
            {sending ? <><Loader2 aria-hidden="true" className="animate-spin" />Sending...</> : <><Bell aria-hidden="true" />Send to {formatCount(users)} User{users === 1 ? '' : 's'}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
