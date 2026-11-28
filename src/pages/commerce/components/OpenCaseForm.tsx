import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { apiErrorInfo, apiErrorMessage } from '@/components/common/detail'
import { endOfIstDay, toIstDateInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import { paymentCasesService, type PaymentCaseDetail } from '@/services/paymentCases.service'
import type { PurchaseType } from '@/services/payments.service'

interface OpenCaseFormProps {
  type: PurchaseType
  purchaseId: string
  refundable: boolean
  onOpened: (c: PaymentCaseDetail) => void
  onCancel: () => void
}

/** Opens a dispute or a refund case on a purchase, by hand. */
export function OpenCaseForm({ type, purchaseId, refundable, onOpened, onCancel }: OpenCaseFormProps) {
  const id = useId()
  const [kind, setKind] = useState<'dispute' | 'refund'>('dispute')
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [due, setDue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<{ message: string; caseId?: string } | null>(null)
  const [touched, setTouched] = useState(false)
  const tooShort = reason.trim().length < 3

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (tooShort) { document.getElementById(`${id}-reason`)?.focus(); return }
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const c = await paymentCasesService.open({
        purchase_type: type, purchase_id: purchaseId, kind, reason: reason.trim(),
        gateway_reference: reference.trim() || undefined,
        evidence_due_at: kind === 'dispute' && due ? endOfIstDay(due) : undefined,
      })
      toast.success(`${c.case_number} opened`)
      onOpened(c)
    } catch (err) {
      const info = apiErrorInfo<{ case_id?: string }>(err)
      setError({ message: apiErrorMessage(err, 'The case could not be opened. Please try again.'), caseId: info.code === 'CASE_EXISTS' ? info.details?.case_id : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <fieldset disabled={saving}>
        <legend className="text-sm font-medium">What is it?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {([
            ['dispute', 'Dispute', 'The student asked their bank to take the payment back.', true],
            ['refund', 'Refund', 'You are returning the money yourself.', refundable],
          ] as const).map(([value, title, text, enabled]) => (
            <label key={value} className={cn('flex gap-3 rounded-lg border px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[hsl(var(--ring))]', !enabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', kind === value ? 'border-primary bg-accent' : 'border-border hover:bg-muted/60')}>
              <input type="radio" name={`${id}-kind`} className="mt-1 accent-[hsl(var(--primary))] focus-visible:outline-none" checked={kind === value} disabled={!enabled} onChange={() => setKind(value)} />
              <span><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block text-[13px] text-muted-foreground">{enabled ? text : 'Already refunded.'}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-reason`} className="text-sm font-medium">What happened</label>
        <Textarea id={`${id}-reason`} className="mt-1.5 bg-card" rows={3} maxLength={2000} value={reason} disabled={saving} aria-invalid={touched && tooShort} aria-describedby={touched && tooShort ? `${id}-reason-error` : undefined}
          onChange={(e) => setReason(e.target.value)} placeholder={kind === 'dispute' ? 'For example: bank says "product not delivered", student paid 4 Nov' : 'For example: bought the wrong package, agreed on the phone'} />
        {touched && tooShort && <p id={`${id}-reason-error`} className="mt-1 text-xs text-danger">Write a few words about what happened.</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-ref`} className="text-sm font-medium">{kind === 'dispute' ? 'Bank or gateway reference' : 'Refund reference, if you have one'}</label>
          <Input id={`${id}-ref`} className="mt-1.5 bg-card font-mono" maxLength={100} value={reference} disabled={saving} onChange={(e) => setReference(e.target.value)} />
        </div>
        {kind === 'dispute' && (
          <div>
            <label htmlFor={`${id}-due`} className="text-sm font-medium">Evidence due by</label>
            <Input id={`${id}-due`} type="date" className="mt-1.5 bg-card" min={toIstDateInput(new Date().toISOString())} value={due} disabled={saving} onChange={(e) => setDue(e.target.value)} />
          </div>
        )}
      </div>

      <p className="text-[13px] text-muted-foreground">Opening a case does not change the student's access and does not move any money.</p>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {error.message} {error.caseId && <Link to={`/commerce/cases/${error.caseId}`} className="font-medium underline underline-offset-4">Open it</Link>}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
          {saving ? 'Opening…' : kind === 'dispute' ? 'Open dispute' : 'Open refund case'}
        </Button>
      </div>
    </form>
  )
}
