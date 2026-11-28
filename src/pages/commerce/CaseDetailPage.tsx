import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeCheck, FileSearch, Loader2, Pencil, RotateCcw, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DetailHeader, DetailSkeleton, ErrorState, FactGrid, Section, Stat, StatusPill, Timeline, apiErrorInfo, apiErrorMessage } from '@/components/common/detail'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { useAuth } from '@/contexts/AuthContext'
import { endOfIstDay, formatINR, toIstDateInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import { paymentCasesService, type CaseEvent, type CaseStatus, type PaymentCaseDetail } from '@/services/paymentCases.service'
import { ACCESS_STATUS, CASE_KIND, CASE_STATUS, PAYMENT_STATUS, TYPE_LABEL, dueLabel, istDay, istDayTime, TWO_COLS } from './components/labels'
import { StudentSection, accessSummary, purchaseHref, purchaseTitle } from './components/PurchaseSections'
import { RevokeAccess } from './components/RevokeAccess'
import { useBack, useRecord } from './components/useRecord'

type Panel = { kind: 'status'; to: CaseStatus } | { kind: 'refund' } | { kind: 'approve' } | { kind: 'revoke' } | { kind: 'facts' } | null

const VERB: Partial<Record<CaseStatus, string>> = { in_progress: 'Mark in progress', won: 'Mark won', lost: 'Mark lost', resolved: 'Mark resolved', dismissed: 'Dismiss' }
const EXPLAIN: Partial<Record<CaseStatus, string>> = {
  in_progress: 'Someone is working on it.',
  won: 'The bank decided in our favour. The case closes.',
  lost: "The bank took the money back. The case closes. This does not end the student's access: revoke it, or record a refund, if it should end.",
  resolved: 'Settled another way. The case closes and nothing else changes.',
  dismissed: 'Opened by mistake, or nothing to do. The case closes and nothing else changes.',
}

/** One dispute, refund or payment problem, start to finish. */
export function CaseDetailPage() {
  const { caseId = '' } = useParams()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission('invoices.update')
  const canAccess = canWrite && hasPermission('users.update')
  const back = useBack({ label: 'Disputes & Refunds', href: '/commerce/cases' })
  const { data: c, loading, error, reload, setData } = useRecord(caseId, () => paymentCasesService.get(caseId))
  const [panel, setPanel] = useState<Panel>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setPanel(null) }, [caseId])
  useEffect(() => {
    if (!panel) return
    panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    panelRef.current?.focus({ preventScroll: true })
  }, [panel])

  if (!c) {
    if (loading) return <DetailSkeleton />
    const missing = error?.status === 404 || error?.status === 400
    return <ErrorState title={missing ? 'This case was not found' : undefined} message={missing ? 'It may have been removed, or the link is wrong.' : error?.message} onRetry={missing ? undefined : reload} back={back} />
  }

  const kind = CASE_KIND[c.kind]
  const status = CASE_STATUS[c.status]
  const p = c.purchase
  const live = c.status === 'open' || c.status === 'in_progress'
  const due = c.evidence_due_at && live ? dueLabel(c.evidence_due_at) : null
  const closed = (next: PaymentCaseDetail) => { setData(next); setPanel(null) }
  const failed = (e: unknown) => { if (apiErrorInfo(e).code === 'CASE_CHANGED') reload() }
  const forward = c.actions.transitions.filter((s) => live || s !== 'in_progress')

  return (
    <div className="space-y-6">
      <DetailHeader
        back={back}
        title={<>{kind?.label || c.kind} <span className="font-mono text-[18px] font-medium text-muted-foreground sm:text-[21px]">{c.case_number}</span></>}
        status={<><StatusPill tone={status?.tone}>{status?.label || c.status}</StatusPill>{due && <StatusPill tone={due.tone}>Evidence {due.label.charAt(0).toLowerCase() + due.label.slice(1)}</StatusPill>}</>}
        subtitle={kind?.explain}
        actions={
          <>
            {c.actions.can_build_evidence && <Button asChild><Link to={`/commerce/cases/${c._id}/evidence`}><FileSearch aria-hidden="true" />Evidence pack</Link></Button>}
            {c.actions.can_approve && canAccess && <Button onClick={() => setPanel({ kind: 'approve' })}><BadgeCheck aria-hidden="true" />Approve access</Button>}
            {c.actions.can_refund && canAccess && <Button variant="outline" onClick={() => setPanel({ kind: 'refund' })}><Undo2 aria-hidden="true" />Record refund</Button>}
          </>
        }
      />

      {error && <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">{error.message} Showing what was loaded before.<Button size="sm" variant="outline" onClick={reload}>Try again</Button></p>}
      {c.gateway_status === 'lost' && c.status !== 'lost' && c.status !== 'refunded' && <p className="rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">The bank decided against us. Decide what happens to the student's access, then mark this case lost.</p>}
      {c.refund?.reference && c.status !== 'refunded' && <p className="rounded-lg bg-warning-soft px-4 py-2.5 text-sm text-warning">Zoho Payments reported a refund{c.refund.amount != null ? ` of ${formatINR(c.refund.amount)}` : ''}, reference <span className="font-mono">{c.refund.reference}</span>. Record it here to end the student's access.</p>}
      {c.actions.access_still_on && (c.status === 'lost' || c.gateway_status === 'lost') && p && (
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warning-soft px-4 py-2.5 text-sm text-warning">
          The student still has access ({accessSummary(p).hint?.toLowerCase() || ACCESS_STATUS[p.access.status]?.label.toLowerCase()}).
          {hasPermission('users.update') && p.capabilities.can_revoke && p.user && <Button size="sm" variant="outline" onClick={() => setPanel({ kind: 'revoke' })}>Revoke access</Button>}
        </p>
      )}

      {panel && (
        <div ref={panelRef} tabIndex={-1} className="outline-none">
          {panel.kind === 'status' && <StatusForm key={panel.to} c={c} to={panel.to} onDone={closed} onFailed={failed} onCancel={() => setPanel(null)} />}
          {panel.kind === 'refund' && <RefundForm c={c} onDone={closed} onFailed={failed} onCancel={() => setPanel(null)} />}
          {panel.kind === 'approve' && <ApproveForm c={c} onDone={closed} onFailed={failed} onCancel={() => setPanel(null)} />}
          {panel.kind === 'facts' && <FactsForm c={c} onDone={closed} onCancel={() => setPanel(null)} />}
          {panel.kind === 'revoke' && p?.user && <RevokeAccess userId={p.user._id} purchaseId={p._id} itemName={purchaseTitle(p)} type={p.type as 'package' | 'ebook' | 'session'} defaultReason={`${c.case_number}: dispute lost`} onDone={() => { setPanel(null); reload() }} onCancel={() => setPanel(null)} />}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Amount" value={formatINR(c.amount)} hint={c.refund?.recorded_at ? `${formatINR(c.refund.amount)} refunded` : undefined} />
        {c.kind === 'dispute'
          ? <Stat label="Evidence due" value={c.evidence_due_at ? istDay(c.evidence_due_at) : 'Not set'} hint={due?.label} />
          : <Stat label="Opened" value={istDay(c.createdAt)} />}
        <Stat label="Purchase" value={p ? PAYMENT_STATUS[p.status]?.label || p.status : 'No purchase'} href={p ? `/commerce/payments/${p.type}/${p._id}` : undefined} />
        <Stat label={p?.type === 'book' ? 'Order' : 'Access'} value={p ? accessSummary(p).value : '—'} hint={p ? accessSummary(p).hint : undefined} href={p ? purchaseHref(p.type, p._id) : undefined} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          {canWrite && forward.length > 0 && (
            <Section title={live ? 'Move it along' : 'Reopen'} description={live ? 'Each step needs a note and is kept with your name.' : 'Only if something new happened, for example the bank reopened it.'}>
              <div className="flex flex-wrap gap-2">
                {forward.map((s) => (
                  <Button key={s} variant={panel?.kind === 'status' && panel.to === s ? 'default' : 'outline'} aria-expanded={panel?.kind === 'status' && panel.to === s} onClick={() => setPanel({ kind: 'status', to: s })}>
                    {!live && <RotateCcw aria-hidden="true" />}{live ? VERB[s] : 'Reopen case'}
                  </Button>
                ))}
              </div>
            </Section>
          )}

          <Section title="Facts" action={canWrite ? <Button size="sm" variant="outline" onClick={() => setPanel({ kind: 'facts' })}><Pencil aria-hidden="true" />Edit</Button> : undefined}>
            <FactGrid
              className={TWO_COLS}
              facts={[
                { label: 'What happened', value: c.reason || null, wide: true },
                { label: 'Opened', value: `${istDayTime(c.createdAt)} IST` },
                { label: 'Opened by', value: c.source === 'admin' ? c.events[0]?.admin_name || 'An admin' : c.source === 'gateway' ? 'Zoho Payments' : 'The system' },
                { label: c.kind === 'dispute' ? 'Bank or gateway reference' : 'Gateway reference', value: c.gateway_reference, copy: c.gateway_reference, mono: true },
                !!c.gateway_status && { label: 'Gateway says', value: c.gateway_status.replace(/_/g, ' ') },
                { label: 'Payment id', value: c.payment_id, copy: c.payment_id, mono: true },
                !!c.payment_session_id && { label: 'Session id', value: c.payment_session_id, copy: c.payment_session_id, mono: true },
                !!c.refund?.recorded_at && { label: 'Refund recorded', value: `${formatINR(c.refund.amount)}, ${istDay(c.refund.recorded_at)}` },
                !!c.refund?.recorded_at && { label: 'Refund reference', value: c.refund.reference, copy: c.refund.reference, mono: true },
                !!c.resolved_at && { label: 'Closed', value: `${istDayTime(c.resolved_at)} IST` },
                !!c.resolution_note && { label: 'How it ended', value: c.resolution_note, wide: true },
              ]}
            />
          </Section>

          <Section title="Purchase" action={p ? <Button asChild size="sm" variant="outline"><Link to={purchaseHref(p.type, p._id)}>Open purchase</Link></Button> : undefined}>
            {p ? (
              <FactGrid
                className={TWO_COLS}
                facts={[
                  { label: TYPE_LABEL[p.type], value: purchaseTitle(p) },
                  { label: 'Charged', value: `${formatINR(p.money.charged)}, ${istDay(p.at)}` },
                  { label: 'Invoice', value: p.documents.invoice ? <Link to={`/commerce/invoices/${p.documents.invoice._id}`} className="font-medium text-primary hover:underline">{p.documents.invoice.invoice_number}</Link> : null },
                  p.documents.delivery_note_available && { label: 'Delivery note', value: p.documents.delivery_note ? p.documents.delivery_note.note_number : 'Not issued' },
                  { label: 'Access', value: `${ACCESS_STATUS[p.access.status]?.label || p.access.status}${p.access.end && ['active', 'upcoming', 'expired'].includes(p.access.status) ? `, until ${istDay(p.access.end)}` : ''}` },
                  !!p.money.coupon && { label: 'Coupon', value: `${p.money.coupon.code} (${formatINR(p.money.coupon.discount)} off)` },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{c.purchase_id ? 'The purchase this case was about no longer exists.' : 'No purchase was found for this payment.'}</p>
            )}
          </Section>

          {(c.user || c.user_id) && <StudentSection user={c.user} userId={c.user_id} />}

          {c.related.length > 0 && (
            <Section title="Other cases on this payment">
              <ul className="divide-y divide-border rounded-lg border border-border">
                {c.related.map((r) => (
                  <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-sm">
                    <Link to={`/commerce/cases/${r._id}`} className="font-medium text-primary hover:underline">{CASE_KIND[r.kind]?.label} <span className="font-mono text-[13px]">{r.case_number}</span></Link>
                    <StatusPill tone={CASE_STATUS[r.status]?.tone}>{CASE_STATUS[r.status]?.label}</StatusPill>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          {canWrite && <NoteForm c={c} onDone={setData} />}
          <Section title="Timeline"><Timeline entries={c.events.map((e, i) => entry(e, i)).reverse()} /></Section>
        </div>
      </div>
    </div>
  )
}

function entry(e: CaseEvent, i: number) {
  const to = e.to ? CASE_STATUS[e.to as CaseStatus] : null
  const title = e.type === 'opened' ? 'Case opened'
    : e.type === 'status' ? `Marked ${to?.label.toLowerCase() || e.to}`
      : e.type === 'note' ? 'Note'
        : e.type === 'gateway' ? 'From Zoho Payments'
          : 'Details changed'
  return {
    id: String(i),
    title,
    meta: `${istDayTime(e.at)} IST${e.admin_name ? ` by ${e.admin_name}` : ''}`,
    body: e.note ? e.note.replace(/^Zoho Payments: /, '') : undefined,
    tone: e.type === 'status' && to ? (to.tone === 'danger' ? 'danger' : to.tone === 'success' ? 'success' : 'warning') as 'danger' | 'success' | 'warning' : undefined,
  }
}

interface FormProps { c: PaymentCaseDetail; onDone: (c: PaymentCaseDetail) => void; onFailed?: (e: unknown) => void; onCancel: () => void }

function useSubmit(onFailed?: (e: unknown) => void) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (work: () => Promise<void>, fallback: string) => {
    if (saving) return
    setSaving(true)
    setError(null)
    try { await work() } catch (e) { setError(apiErrorMessage(e, fallback)); setSaving(false); onFailed?.(e) }
  }
  return { saving, error, run }
}

const Problem = ({ text }: { text: string | null }) => (text ? <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{text}</p> : null)

function NoteField({ id, label, value, onChange, disabled, touched, placeholder, required = true }: { id: string; label: string; value: string; onChange: (v: string) => void; disabled: boolean; touched: boolean; placeholder?: string; required?: boolean }) {
  const bad = required && touched && value.trim().length < 3
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <Textarea id={id} className="mt-1.5 bg-card" rows={3} maxLength={2000} value={value} disabled={disabled} placeholder={placeholder} aria-invalid={bad} aria-describedby={bad ? `${id}-error` : undefined} onChange={(e) => onChange(e.target.value)} />
      {bad && <p id={`${id}-error`} className="mt-1 text-xs text-danger">Write a short note.</p>}
    </div>
  )
}

function StatusForm({ c, to, onDone, onFailed, onCancel }: FormProps & { to: CaseStatus }) {
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const { saving, error, run } = useSubmit(onFailed)
  useUnsavedChanges(note.trim().length > 0 && !saving)
  const reopen = !['open', 'in_progress'].includes(c.status)
  const verb = reopen ? 'Reopen case' : VERB[to] || 'Save'
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (note.trim().length < 3) { document.getElementById('status-note')?.focus(); return }
    run(async () => {
      const next = await paymentCasesService.changeStatus(c._id, to, note.trim())
      toast.success(reopen ? `${c.case_number} reopened` : `${c.case_number} marked ${CASE_STATUS[to].label.toLowerCase()}`)
      onDone(next)
    }, 'The status could not be changed. Please try again.')
  }
  return (
    <Section title={verb} description={reopen ? undefined : EXPLAIN[to]}>
      <form onSubmit={submit} noValidate>
        <NoteField id="status-note" label="Note" value={note} onChange={setNote} disabled={saving} touched={touched} placeholder="What was decided, and why" />
        <Problem text={error} />
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 aria-hidden="true" className="animate-spin" />}{saving ? 'Saving…' : verb}</Button>
        </div>
      </form>
    </Section>
  )
}

function RefundForm({ c, onDone, onFailed, onCancel }: FormProps) {
  const max = c.actions.refund_max
  const p = c.purchase
  const [reference, setReference] = useState(c.refund?.reference || (c.kind === 'refund' ? c.gateway_reference || '' : ''))
  const [amount, setAmount] = useState(String(c.refund?.amount ?? max ?? ''))
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [touched, setTouched] = useState(false)
  const { saving, error, run } = useSubmit(onFailed)
  useUnsavedChanges((!!note.trim() || confirm) && !saving)

  const value = Number(amount)
  const badRef = reference.trim().length < 3
  const badAmount = !amount.trim() || !Number.isFinite(value) || value <= 0 || (max != null && value > max + 0.5)
  const partial = !badAmount && max != null && value < max - 0.5

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (badRef) { document.getElementById('refund-ref')?.focus(); return }
    if (badAmount) { document.getElementById('refund-amount')?.focus(); return }
    if (!confirm) { document.getElementById('refund-confirm')?.focus(); return }
    run(async () => {
      const next = await paymentCasesService.recordRefund(c._id, { reference: reference.trim(), amount: value, note: note.trim() || undefined, confirm: true })
      toast.success(`Refund of ${formatINR(value)} recorded`)
      onDone(next)
    }, 'The refund could not be recorded. It is safe to try again.')
  }

  return (
    <Section title="Record refund" className="border-danger/30">
      <form onSubmit={submit} noValidate>
        <div className="rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          <p className="font-medium">Refund the money in Zoho Payments first, then record it here.</p>
          <p className="mt-1">This page does not send any money.{p ? ` Recording it marks ${purchaseTitle(p)} as refunded and ends the student's access now${p.access.bundled.length ? ', with the packages included in the combo' : ''}.` : ''}{p?.money.coupon ? ' The coupon use is given back.' : ''}{p?.type === 'book' && ['pending', 'confirmed', 'processing'].includes(p.access.status) ? ' The order is cancelled and the books go back to stock.' : ''}</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="refund-ref" className="text-sm font-medium">Refund reference</label>
            <Input id="refund-ref" className="mt-1.5 bg-card font-mono" maxLength={100} value={reference} disabled={saving} aria-invalid={touched && badRef} aria-describedby="refund-ref-help" onChange={(e) => setReference(e.target.value)} />
            <p id="refund-ref-help" className={cn('mt-1 text-xs', touched && badRef ? 'text-danger' : 'text-muted-foreground')}>{touched && badRef ? 'Enter the refund id from Zoho Payments.' : 'The refund id in Zoho Payments.'}</p>
          </div>
          <div>
            <label htmlFor="refund-amount" className="text-sm font-medium">Amount refunded (INR)</label>
            <Input id="refund-amount" inputMode="decimal" className="mt-1.5 bg-card tabular-nums" value={amount} disabled={saving} aria-invalid={touched && badAmount} aria-describedby="refund-amount-help" onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
            <p id="refund-amount-help" className={cn('mt-1 text-xs', touched && badAmount ? 'text-danger' : 'text-muted-foreground')}>{touched && badAmount ? (max != null && value > max ? `Not more than the ${formatINR(max)} that was paid.` : 'Enter the amount.') : max != null ? `${formatINR(max)} was paid.` : ''}</p>
          </div>
        </div>
        {partial && <p className="mt-4 rounded-lg bg-muted px-3.5 py-2.5 text-sm">This is less than what was paid. Access still ends. For a part refund that keeps access, add a note and mark the case resolved instead.</p>}
        <div className="mt-4"><NoteField id="refund-note" label="Note (optional)" value={note} onChange={setNote} disabled={saving} touched={false} required={false} /></div>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm">
          <input id="refund-confirm" type="checkbox" className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" checked={confirm} disabled={saving} aria-invalid={touched && !confirm} onChange={(e) => setConfirm(e.target.checked)} />
          <span>The refund of {badAmount ? 'this amount' : formatINR(value)} is done in Zoho Payments.{touched && !confirm && <span className="block text-xs text-danger">Confirm this before recording it.</span>}</span>
        </label>
        <Problem text={error} />
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="destructive" disabled={saving}>{saving && <Loader2 aria-hidden="true" className="animate-spin" />}{saving ? 'Recording…' : 'Record refund'}</Button>
        </div>
      </form>
    </Section>
  )
}

function ApproveForm({ c, onDone, onFailed, onCancel }: FormProps) {
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const { saving, error, run } = useSubmit(onFailed)
  useUnsavedChanges(note.trim().length > 0 && !saving)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (note.trim().length < 3) { document.getElementById('approve-note')?.focus(); return }
    run(async () => {
      const next = await paymentCasesService.approve(c._id, note.trim())
      toast.success('Access approved. The student can use it now.')
      onDone(next)
    }, 'Access could not be approved. It is safe to try again.')
  }
  return (
    <Section title="Approve access" description={`The student paid ${formatINR(c.amount)}. Approving switches the purchase on now, at that price, and counts the coupon use even though its limit was reached.`}>
      <form onSubmit={submit} noValidate>
        <NoteField id="approve-note" label="Why" value={note} onChange={setNote} disabled={saving} touched={touched} placeholder="For example: coupon was advertised to this batch" />
        <Problem text={error} />
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 aria-hidden="true" className="animate-spin" />}{saving ? 'Approving…' : 'Approve access'}</Button>
        </div>
      </form>
    </Section>
  )
}

function FactsForm({ c, onDone, onCancel }: FormProps) {
  const initial = toIstDateInput(c.evidence_due_at)
  const [due, setDue] = useState(initial)
  const [reference, setReference] = useState(c.gateway_reference || '')
  const { saving, error, run } = useSubmit()
  const dirty = due !== initial || reference.trim() !== (c.gateway_reference || '')
  useUnsavedChanges(dirty && !saving)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dirty) { onCancel(); return }
    run(async () => {
      const next = await paymentCasesService.update(c._id, {
        ...(due !== initial ? { evidence_due_at: due ? endOfIstDay(due) : '' } : {}),
        ...(reference.trim() !== (c.gateway_reference || '') ? { gateway_reference: reference.trim() } : {}),
      })
      toast.success('Case details saved')
      onDone(next)
    }, 'The details could not be saved. Please try again.')
  }
  return (
    <Section title="Edit case details">
      <form onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          {c.kind === 'dispute' && (
            <div>
              <label htmlFor="facts-due" className="text-sm font-medium">Evidence due by</label>
              <Input id="facts-due" type="date" className="mt-1.5 bg-card" value={due} disabled={saving} onChange={(e) => setDue(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">To the end of that day, IST. Leave empty if there is no date.</p>
            </div>
          )}
          <div>
            <label htmlFor="facts-ref" className="text-sm font-medium">{c.kind === 'dispute' ? 'Bank or gateway reference' : 'Gateway reference'}</label>
            <Input id="facts-ref" className="mt-1.5 bg-card font-mono" maxLength={100} value={reference} disabled={saving} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>
        <Problem text={error} />
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 aria-hidden="true" className="animate-spin" />}{saving ? 'Saving…' : 'Save details'}</Button>
        </div>
      </form>
    </Section>
  )
}

function NoteForm({ c, onDone }: { c: PaymentCaseDetail; onDone: (c: PaymentCaseDetail) => void }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  useUnsavedChanges(note.trim().length > 0 && !saving)
  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (note.trim().length < 3 || saving) return
    setSaving(true)
    try {
      const next = await paymentCasesService.addNote(c._id, note.trim())
      toast.success('Note added')
      setNote('')
      onDone(next)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'The note could not be added.'))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Section title="Add a note">
      <form onSubmit={add}>
        <label htmlFor="case-note" className="sr-only">Note</label>
        <Textarea id="case-note" className="bg-card" rows={3} maxLength={2000} placeholder="Calls, emails, what the bank said. Kept with your name." value={note} disabled={saving} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-2 flex justify-end"><Button type="submit" size="sm" variant="outline" disabled={saving || note.trim().length < 3}>{saving && <Loader2 aria-hidden="true" className="animate-spin" />}{saving ? 'Adding…' : 'Add note'}</Button></div>
      </form>
    </Section>
  )
}
