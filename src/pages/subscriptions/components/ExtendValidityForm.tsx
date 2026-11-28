import { useEffect, useId, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { apiErrorMessage } from '@/components/common/detail'
import { endOfIstDay, toIstDateInput } from '@/lib/format'
import { formatExpiry } from '@/lib/relativeTime'
import { subscriptionsService } from '@/services/subscriptions.service'

const QUICK_DAYS = [7, 30, 90]
const ist = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })

interface ExtendValidityFormProps {
  purchaseId: string
  expiresAt: string | null
  /** Called after a successful extend with the new expiry ISO string. */
  onExtended: (newExpiry: string) => void
  onCancel: () => void
  /** A combo's included packages follow its new date. */
  includesPackages?: boolean
  className?: string
}

/** Add days, or set an exact end date. Dates are IST and the whole day counts. */
export function ExtendValidityForm({ purchaseId, expiresAt, onExtended, onCancel, includesPackages, className }: ExtendValidityFormProps) {
  const id = useId()
  const [days, setDays] = useState<number | null>(null)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setDays(null); setDate(''); setReason(''); setError(null) }, [purchaseId])

  const expired = !!expiresAt && new Date(expiresAt) <= new Date()
  let preview: Date | null = null
  if (days != null) {
    // Same rule as the server: from today when it has ended, else from the current date.
    preview = !expiresAt || expired ? new Date() : new Date(expiresAt)
    preview.setDate(preview.getDate() + days)
  } else if (date) preview = new Date(endOfIstDay(date))
  const shortens = !!preview && !!expiresAt && !expired && preview < new Date(expiresAt)
  const canSave = preview !== null && !saving

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const why = reason.trim() || undefined
      const res = await subscriptionsService.extend(purchaseId, days != null ? { days, reason: why } : { new_expiry: endOfIstDay(date), reason: why })
      const until = res.data!.new_expiry
      toast.success(`Validity extended to ${ist.format(new Date(until))}`)
      onExtended(until)
      setDays(null); setDate(''); setReason('')
    } catch (err) {
      setError(apiErrorMessage(err, 'The validity could not be changed. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className={cn('space-y-5', className)}>
      <fieldset disabled={saving}>
        <legend className="text-sm font-medium">Quick extend</legend>
        <p className="text-xs text-muted-foreground">{expired ? 'Already ended, so days count from today.' : 'Added to the current end date.'}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_DAYS.map((d) => (
            <Button key={d} type="button" size="sm" variant={days === d ? 'default' : 'outline'} aria-pressed={days === d} onClick={() => { setDays(days === d ? null : d); setDate('') }}>
              +{d} days
            </Button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-date`} className="text-sm font-medium">Or set an exact end date</label>
        <Input id={`${id}-date`} type="date" className="mt-1.5 max-w-[220px] bg-card" value={date} min={toIstDateInput(new Date().toISOString())} disabled={saving} onChange={(e) => { setDate(e.target.value); setDays(null) }} />
        <p className="mt-1 text-xs text-muted-foreground">Access runs to the end of that day, IST.</p>
      </div>

      <div>
        <label htmlFor={`${id}-reason`} className="text-sm font-medium">Reason</label>
        <Textarea id={`${id}-reason`} className="mt-1.5 bg-card" rows={2} maxLength={500} value={reason} disabled={saving} onChange={(e) => setReason(e.target.value)} placeholder="For example: payment delay, goodwill extension" />
        <p className="mt-1 text-xs text-muted-foreground">Optional. Kept on the purchase with your name.</p>
      </div>

      {preview && (
        <p aria-live="polite" className={cn('rounded-lg px-3.5 py-2.5 text-sm', shortens ? 'bg-warning-soft text-warning' : 'bg-accent text-accent-foreground')}>
          New end date: <span className="font-semibold">{ist.format(preview)}</span> ({formatExpiry(preview).relative}){shortens && '. This is earlier than the current date.'}
          {includesPackages && ' The packages included with this combo follow.'}
        </p>
      )}
      {error && <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={!canSave}>
          {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
          {saving ? 'Extending…' : 'Extend validity'}
        </Button>
      </div>
    </form>
  )
}
