import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileCheck2, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FactGrid, Section, StatusPill, Timeline, apiErrorMessage, type Fact } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { formatINR, subscriptionLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { deliveryNotesService } from '@/services/deliveryNotes.service'
import type { PurchaseBrief, PurchaseDetail, PurchaseType } from '@/services/payments.service'
import { ACCESS_STATUS, CASE_KIND, CASE_STATUS, GATEWAY_LABEL, PAYMENT_STATUS, TYPE_LABEL, dueLabel, istDay, istDayTime, money, planLabel, TWO_COLS } from './labels'
import type { CaseKind, CaseStatus } from '@/services/paymentCases.service'

export const purchaseHref = (type: PurchaseType, id: string) => `/commerce/purchases/${type}/${id}`

/** "TECOM Theory Package · 6 months subscription" */
export function purchaseTitle(p: PurchaseDetail): string {
  // The dot stays with the name when a long title wraps.
  return p.type === 'package' ? subscriptionLabel(p.item.name, { tier_duration_days: p.tier.duration_days, tier_name: p.tier.name }).replace(' · ', '\u00A0· ') : p.item.name
}

/** The page of the thing that was bought. */
export function itemHref(type: PurchaseType, id: string | null | undefined): string | null {
  if (!id) return null
  switch (type) {
    case 'package': return `/content/packages/${id}`
    case 'session': return `/sessions/${id}`
    case 'workshop': return `/workshops/${id}`
    case 'ebook':
    case 'book': return `/content/books/${id}`
    case 'form': return `/content/forms/${id}/submissions`
    default: return null
  }
}

const link = 'font-medium text-primary hover:underline'

// ── Student ──────────────────────────────────────────────────────────────
export function StudentSection({ user, userId, narrow }: { user: PurchaseDetail['user']; userId: string | null; narrow?: boolean }) {
  const { hasPermission } = useAuth()
  if (!user) {
    return (
      <Section title="Student">
        <p className="text-sm text-muted-foreground">This account was deleted.{userId && <> Its old id was <span className="font-mono text-[13px]">{userId}</span>.</>}</p>
      </Section>
    )
  }
  const facts: Fact[] = [
    { label: 'Name', value: hasPermission('users.read') ? <Link to={`/users/${user._id}`} className={link}>{user.name || 'No name'}</Link> : user.name || 'No name' },
    { label: 'Phone', value: user.phone_number, copy: user.phone_number, mono: true },
    { label: 'Email', value: user.email, copy: user.email },
    { label: 'Student ID', value: user.student_id, copy: user.student_id, mono: true },
  ]
  return <Section title="Student"><FactGrid facts={facts} className={narrow ? 'sm:grid-cols-1 xl:grid-cols-1' : TWO_COLS} /></Section>
}

// ── What was bought ──────────────────────────────────────────────────────
export function BoughtSection({ p }: { p: PurchaseDetail }) {
  const href = p.item.deleted ? null : itemHref(p.type, p.item.id)
  const facts: (Fact | null | false)[] = [
    { label: p.type === 'book' ? 'Order' : TYPE_LABEL[p.type], value: href ? <Link to={href} className={link}>{p.item.name}</Link> : <span className={p.item.deleted ? 'font-normal text-muted-foreground' : undefined}>{p.item.name}</span> },
    p.type === 'package' && { label: 'Plan', value: planLabel(p.tier) || 'Single plan' },
    p.type === 'package' && !!p.tier.name && { label: 'Plan name', value: p.tier.name },
    !!p.item.subject && { label: 'Subject', value: <Link to={`/content/subjects/${p.item.subject._id}`} className={link}>{p.item.subject.name}</Link> },
    { label: p.type === 'book' ? 'Ordered' : 'Purchased', value: `${istDayTime(p.at)} IST` },
    !!p.item.starts_at && { label: p.type === 'workshop' ? 'Dates' : 'Held on', value: p.type === 'workshop' ? `${istDay(p.item.starts_at)} to ${istDay(p.item.ends_at)}` : `${istDayTime(p.item.starts_at)} IST` },
    !!p.item.submission && { label: 'Form submitted', value: `${istDayTime(p.item.submission.submitted_at)} IST` },
    !!p.access.enrollment && { label: 'Enrolment', value: `${cap(p.access.enrollment.status)}${p.access.enrollment.attended_at ? `, attended ${istDay(p.access.enrollment.attended_at)}` : p.access.enrollment.days_attended ? `, attended ${p.access.enrollment.days_attended} day${p.access.enrollment.days_attended === 1 ? '' : 's'}` : ''}` },
    p.is_admin_granted && { label: 'Given by', value: p.grant?.by || 'An admin' },
    p.is_admin_granted && !!p.grant?.reason && { label: 'Reason given', value: p.grant.reason },
    p.is_admin_granted && !!p.grant?.notes && { label: 'Admin notes', value: p.grant.notes, wide: true },
  ]
  return (
    <Section title="What was bought">
      <FactGrid facts={facts} className={TWO_COLS} />
      {!!p.item.lines?.length && (
        <ul className="mt-5 divide-y divide-border rounded-lg border border-border">
          {p.item.lines.map((l, i) => (
            <li key={`${l.book_id}-${i}`} className="flex items-start justify-between gap-4 px-3.5 py-2.5 text-sm">
              <span className="min-w-0">
                {l.deleted ? <span className="text-muted-foreground">{l.title} (deleted)</span> : <Link to={`/content/books/${l.book_id}`} className={link}>{l.title}</Link>}
                <span className="text-muted-foreground"> x {l.quantity}</span>
              </span>
              <span className="shrink-0 tabular-nums">{formatINR(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')

// ── Money ────────────────────────────────────────────────────────────────
export function MoneySection({ p }: { p: PurchaseDetail }) {
  const m = p.money
  const { hasPermission } = useAuth()
  const free = m.charged === 0
  const rows: { label: ReactNode; value: ReactNode; minus?: boolean; note?: string }[] = []
  if (p.type === 'book') {
    if (m.subtotal != null) rows.push({ label: 'Books', value: formatINR(m.subtotal) })
    if (m.shipping != null) rows.push({ label: 'Shipping', value: m.shipping ? formatINR(m.shipping) : 'Free' })
  } else {
    if (m.list_price != null) rows.push({ label: 'List price', value: formatINR(m.list_price) })
    if (m.sale_discount) rows.push({ label: 'Sale', value: formatINR(m.sale_discount), minus: true })
    if (m.upgrade_credit) rows.push({ label: 'Credit for the plan it replaced', value: formatINR(m.upgrade_credit), minus: true })
  }
  if (m.coupon) {
    rows.push({
      label: <>Coupon {m.coupon._id && hasPermission('coupons.read') ? <Link to={`/commerce/coupons/${m.coupon._id}`} className={cn(link, 'font-mono')}>{m.coupon.code}</Link> : <span className="font-mono">{m.coupon.code}</span>}</>,
      value: formatINR(m.coupon.discount),
      minus: true,
    })
  }
  if (m.gst != null && m.price_before_gst != null) rows.push({ label: 'Price before GST', value: formatINR(m.price_before_gst) })
  if (m.gst != null) rows.push({ label: 'GST', value: formatINR(m.gst), note: m.gst_source === 'computed' ? '18% of the price, worked out from the total' : 'From the invoice' })

  return (
    <Section title="Money">
      {free ? (
        <p className="text-sm text-muted-foreground">{p.bundled ? 'Nothing was charged for this row. It came with a combo.' : p.is_admin_granted ? 'Nothing was charged. An admin gave this access.' : 'Nothing was charged.'}</p>
      ) : (
        <dl className="max-w-lg space-y-2 text-sm">
          {rows.map((r, i) => (
            <div key={i} className="flex items-baseline justify-between gap-4">
              <dt className="min-w-0 text-muted-foreground">{r.label}{r.note && <span className="block text-xs">{r.note}</span>}</dt>
              <dd className="shrink-0 tabular-nums">{r.minus ? `- ${r.value}` : r.value}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2.5">
            <dt className="font-semibold">Total charged</dt>
            <dd className="font-display text-lg font-semibold tabular-nums">{money(m.charged, m.currency)}</dd>
          </div>
          {m.charged_is_pre_tax && <p className="text-xs text-muted-foreground">An older record: this is the price before GST. The amount charged at the gateway was not stored.</p>}
          {m.gateway_fee != null && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Gateway fee paid by the student</dt>
              <dd className="tabular-nums">{formatINR(m.gateway_fee)}</dd>
            </div>
          )}
          {p.refund && (
            <div className="flex items-baseline justify-between gap-4 text-danger">
              <dt>Refunded{p.refund.at ? ` ${istDay(p.refund.at)}` : ''}{p.refund.reference && <span className="block font-mono text-xs">{p.refund.reference}</span>}</dt>
              <dd className="tabular-nums">{p.refund.amount != null ? `- ${formatINR(p.refund.amount)}` : 'Amount not recorded'}</dd>
            </div>
          )}
        </dl>
      )}
    </Section>
  )
}

// ── Access ───────────────────────────────────────────────────────────────
function BriefLink({ b, showStatus = true }: { b: PurchaseBrief; showStatus?: boolean }) {
  return (
    <span>
      <Link to={purchaseHref('package', b._id)} className={link}>{subscriptionLabel(b.name, b)}</Link>
      {showStatus && <span className="block text-xs text-muted-foreground">{b.is_revoked || !b.is_active ? (b.payment_status === 'refunded' ? 'Refunded' : b.is_revoked ? 'Revoked' : 'Not active') : b.expires_at ? `until ${istDay(b.expires_at)}` : ''}</span>}
    </span>
  )
}

export function accessSummary(p: PurchaseDetail): { value: string; hint?: string } {
  const a = p.access
  const label = ACCESS_STATUS[a.status]?.label || a.status
  if (a.status === 'active' && a.lifetime) return { value: 'Lifetime' }
  if (a.status === 'active' && a.days_left != null) return { value: a.days_left === 0 ? 'Last day' : `${a.days_left} day${a.days_left === 1 ? '' : 's'} left`, hint: a.end ? `Until ${istDay(a.end)}` : undefined }
  if (a.status === 'upcoming') return { value: 'Starts later', hint: a.start ? `${istDay(a.start)} to ${istDay(a.end)}` : undefined }
  if (a.status === 'held') return { value: 'No access', hint: 'Paid, held for review' }
  if (a.status === 'expired') return { value: 'Ended', hint: a.end ? istDay(a.end) : undefined }
  return { value: label, hint: a.end && ['active', 'ended'].includes(a.status) ? istDay(a.end) : undefined }
}

export function AccessSection({ p }: { p: PurchaseDetail }) {
  const a = p.access
  const s = ACCESS_STATUS[a.status] || { label: a.status, tone: 'neutral' as const }
  if (p.type === 'book') return null
  // Ended early: the stored end date is what it would have been.
  const early = ['refunded', 'revoked', 'replaced', 'inactive'].includes(a.status)
  const facts: (Fact | null | false)[] = [
    { label: 'State', value: <StatusPill tone={s.tone}>{s.label}</StatusPill> },
    !!a.start && { label: p.type === 'package' || p.type === 'ebook' ? 'From' : 'Starts', value: `${istDayTime(a.start)} IST` },
    a.lifetime ? { label: 'Until', value: 'Lifetime, no end date' } : !!a.end && { label: p.type !== 'package' ? 'Ends' : early ? 'Would have run until' : 'Until', value: `${istDayTime(a.end)} IST` },
    a.days_left != null && { label: 'Days left', value: String(a.days_left) },
    !!a.revoked && { label: 'Revoked', value: a.revoked.at ? `${istDayTime(a.revoked.at)} IST` : 'Date not recorded' },
    !!a.revoked?.reason && { label: 'Reason', value: a.revoked.reason, wide: true },
    !!a.combo_parent && { label: 'Came with', value: <BriefLink b={a.combo_parent} /> },
    !!a.renewed_by && { label: 'Renewed by', value: <BriefLink b={a.renewed_by} /> },
    !!a.upgraded_to && { label: 'Replaced by', value: <BriefLink b={a.upgraded_to} /> },
    a.renews.length > 0 && { label: 'Renews', value: <span className="space-y-1">{a.renews.map((b) => <span key={b._id} className="block"><BriefLink b={b} /></span>)}</span> },
    a.upgraded_from.length > 0 && { label: 'Replaced', value: <span className="space-y-1">{a.upgraded_from.map((b) => <span key={b._id} className="block"><BriefLink b={b} showStatus={false} /></span>)}</span> },
  ]
  return (
    <Section title="Access">
      <FactGrid facts={facts} className={TWO_COLS} />
      {a.bundled.length > 0 && (
        <div className="mt-5">
          <h3 className="text-[13px] text-muted-foreground">Included with this combo</h3>
          <ul className="mt-1.5 divide-y divide-border rounded-lg border border-border">
            {a.bundled.map((b) => (
              <li key={b._id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3.5 py-2.5 text-sm">
                <Link to={purchaseHref('package', b._id)} className={link}>{b.name}</Link>
                <span className="text-muted-foreground">{b.is_active && !b.is_revoked ? `until ${istDay(b.expires_at)}` : b.payment_status === 'refunded' ? 'Refunded' : b.is_revoked ? 'Revoked' : 'Not active'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  )
}

// ── Payment ──────────────────────────────────────────────────────────────
export function paymentFacts(p: PurchaseDetail): (Fact | null | false)[] {
  const pay = p.payment
  if (!pay) return []
  const s = PAYMENT_STATUS[pay.status]
  const given = /^(ADMIN_GRANT_|BUNDLE_)/.test(pay.session_id || '')
  return [
    { label: 'Status', value: <StatusPill tone={s?.tone}>{s?.label || pay.status}</StatusPill> },
    { label: 'Gateway', value: given ? 'None, no checkout' : pay.gateway ? GATEWAY_LABEL[pay.gateway] || pay.gateway : null },
    { label: 'Payment id', value: pay.payment_id, copy: pay.payment_id, mono: true },
    !given && { label: 'Session id', value: pay.session_id, copy: pay.session_id, mono: true },
    !!pay.zoho_invoice_id && { label: 'Zoho invoice id', value: pay.zoho_invoice_id, copy: pay.zoho_invoice_id, mono: true },
    !!pay.claim && pay.claim.this_purchase && { label: 'Recorded on the invoice', value: pay.claim.recorded_at ? `${istDayTime(pay.claim.recorded_at)} IST` : 'Not yet' },
  ]
}

/** The student's other checkouts for the same item. */
export function Attempts({ p }: { p: PurchaseDetail }) {
  if (!p.attempts.length) return null
  return (
    <div className="mt-5">
      <h3 className="text-[13px] text-muted-foreground">Other checkouts by this student for the same item</h3>
      <ul className="mt-1.5 divide-y divide-border rounded-lg border border-border">
        {p.attempts.map((t) => {
          const s = PAYMENT_STATUS[t.is_revoked && t.payment_status === 'completed' ? 'revoked' : t.payment_status]
          return (
            <li key={t._id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-3.5 py-2.5 text-sm">
              <Link to={purchaseHref(p.type, t._id)} className={link}>{istDayTime(t.at)}</Link>
              <span className="flex items-center gap-3">
                <span className="tabular-nums">{formatINR(t.amount)}</span>
                <StatusPill tone={s?.tone}>{s?.label || t.payment_status}</StatusPill>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ClaimWarning({ p }: { p: PurchaseDetail }) {
  const claim = p.payment?.claim
  if (!claim || claim.this_purchase) return null
  return (
    <p role="status" className="mt-4 rounded-lg bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
      This payment id belongs to another purchase. <Link to={purchaseHref(claim.purchase_type, claim.purchase_id)} className="font-medium underline underline-offset-4">Open it</Link>
    </p>
  )
}

// ── Documents ────────────────────────────────────────────────────────────
const NOTE_STATUS: Record<string, string> = { sent: 'Emailed', generated: 'Not emailed yet', failed: 'Email failed' }

export function DocumentsSection({ p, onChanged }: { p: PurchaseDetail; onChanged: () => void }) {
  const { hasPermission } = useAuth()
  const [busy, setBusy] = useState<'pdf' | 'issue' | null>(null)
  const [confirm, setConfirm] = useState(false)
  const note = p.documents.delivery_note
  const invoice = p.documents.invoice
  const canIssue = hasPermission('invoices.update') && hasPermission('payments.read') && p.payment_status === 'completed' && p.status === 'completed'

  const download = async () => {
    if (!note) return
    setBusy('pdf')
    try { await deliveryNotesService.downloadPdf({ _id: note._id, note_number: note.note_number }) } catch (e) { toast.error(apiErrorMessage(e, 'The PDF could not be downloaded.')) } finally { setBusy(null) }
  }
  const issue = async () => {
    setBusy('issue')
    try {
      const res = await deliveryNotesService.issue(p.type as 'package' | 'ebook', p._id)
      const n = res.data!.delivery_note
      if (n.status === 'sent') toast.success(`${n.note_number} issued and emailed`)
      else toast.warning(`${n.note_number} issued, but the email was not sent`)
      setConfirm(false)
      onChanged()
    } catch (e) { toast.error(apiErrorMessage(e, 'The delivery note could not be issued.')) } finally { setBusy(null) }
  }

  return (
    <Section title="Documents">
      <ul className="divide-y divide-border rounded-lg border border-border text-sm">
        <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3.5 py-3">
          <span>
            <span className="block text-[13px] text-muted-foreground">Invoice</span>
            {invoice
              ? (hasPermission('invoices.read') ? <Link to={`/commerce/invoices/${invoice._id}`} className={cn(link, 'font-mono')}>{invoice.invoice_number}</Link> : <span className="font-mono">{invoice.invoice_number}</span>)
              : <span className="text-muted-foreground">{p.sale ? 'None on record' : 'None'}</span>}
          </span>
          {invoice && <span className="text-muted-foreground">{formatINR(invoice.amount)}, {istDay(invoice.created_at)}</span>}
        </li>
        {p.documents.delivery_note_available && (
          <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3.5 py-3">
            <span>
              <span className="block text-[13px] text-muted-foreground">Delivery note</span>
              {note
                ? <><Link to={`/commerce/delivery-notes?purchase_type=${p.type}&purchase_id=${p._id}`} className={cn(link, 'font-mono')}>{note.note_number}</Link><span className="block text-xs text-muted-foreground">{NOTE_STATUS[note.status] || note.status}{note.sent_at ? ` ${istDayTime(note.sent_at)} IST` : ''}{note.by ? `, issued by ${note.by}` : ''}</span></>
                : <span className="text-muted-foreground">{p.payment_status === 'completed' ? 'Not issued' : 'Issued when the purchase is active'}</span>}
            </span>
            {note && hasPermission('payments.read') && (
              <Button size="sm" variant="outline" onClick={download} disabled={busy !== null}>
                {busy === 'pdf' ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}PDF
              </Button>
            )}
            {!note && canIssue && !confirm && (
              <Button size="sm" variant="outline" onClick={() => setConfirm(true)}><FileCheck2 aria-hidden="true" />Issue delivery note</Button>
            )}
            {!note && confirm && (
              <div role="alert" className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg bg-warning-soft px-3.5 py-2.5">
                <span className="text-sm text-warning">The student gets the email now. Continue?</span>
                <span className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(false)} disabled={busy !== null}>Cancel</Button>
                  <Button size="sm" onClick={issue} disabled={busy !== null}>
                    {busy === 'issue' ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Mail aria-hidden="true" />}{busy === 'issue' ? 'Issuing…' : 'Issue and email'}
                  </Button>
                </span>
              </div>
            )}
          </li>
        )}
      </ul>
    </Section>
  )
}

// ── Terms and device ─────────────────────────────────────────────────────
const OLD = <span className="font-normal text-muted-foreground">Not recorded (older purchase)</span>

export function TermsSection({ p }: { p: PurchaseDetail }) {
  if (p.bundled) return null
  const d = p.device
  return (
    <Section title="Terms and device" description="What the student agreed to, and where they bought from.">
      <FactGrid
        className={TWO_COLS}
        facts={[
          { label: 'Terms accepted', value: p.terms.accepted ? `${p.terms.at ? `${istDayTime(p.terms.at)} IST` : 'Yes'}${p.terms.version ? ` (version ${p.terms.version})` : ''}` : <span className="font-normal text-muted-foreground">Not recorded</span> },
          d && { label: 'Accepted from IP', value: d.terms_ip || OLD, copy: d.terms_ip, mono: !!d.terms_ip },
          d && { label: 'Ordered from IP', value: d.purchase_ip || OLD, copy: d.purchase_ip, mono: !!d.purchase_ip },
          d && { label: 'Ordered on', value: d.purchase_user_agent || OLD },
          d && !!d.terms_user_agent && d.terms_user_agent !== d.purchase_user_agent && { label: 'Accepted on', value: d.terms_user_agent },
        ]}
      />
    </Section>
  )
}

// ── Cases ────────────────────────────────────────────────────────────────
export function CasesSection({ p, action }: { p: PurchaseDetail; action?: ReactNode }) {
  if (!p.payment) return null
  if (!p.cases.length && !action) return null
  return (
    <Section title="Disputes and refunds" action={action}>
      {p.cases.length === 0 ? (
        <p className="text-sm text-muted-foreground">No dispute or refund on this purchase.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {p.cases.map((c) => {
            const s = CASE_STATUS[c.status as CaseStatus]
            const due = c.evidence_due_at && !c.resolved_at ? dueLabel(c.evidence_due_at) : null
            return (
              <li key={c._id} className="px-3.5 py-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/commerce/cases/${c._id}`} className={link}>{CASE_KIND[c.kind as CaseKind]?.label || c.kind} <span className="font-mono text-[13px]">{c.case_number}</span></Link>
                  <span className="flex flex-wrap gap-1.5">
                    {due && <StatusPill tone={due.tone}>{due.label}</StatusPill>}
                    <StatusPill tone={s?.tone}>{s?.label || c.status}</StatusPill>
                  </span>
                </div>
                {c.reason && <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{c.reason}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

// ── Timeline ─────────────────────────────────────────────────────────────
export function TimelineSection({ items, title = 'Timeline' }: { items: PurchaseDetail['timeline']; title?: string }) {
  return (
    <Section title={title}>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">Nothing recorded yet.</p> : (
        <Timeline
          entries={items.map((t, i) => ({
            id: `${t.kind}-${i}`,
            title: t.href ? <Link to={t.href} className="hover:text-primary hover:underline">{t.title}</Link> : t.title,
            meta: `${istDayTime(t.at)} IST${t.by ? ` by ${t.by}` : ''}`,
            body: t.note || undefined,
            tone: t.tone,
          }))}
        />
      )}
    </Section>
  )
}
