import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarPlus, CreditCard, Loader2, RefreshCw, ShieldAlert, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { apiService } from '@/services/api.service'
import { apiErrorMessage } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { DetailHeader, DetailSkeleton, ErrorState, FactGrid, Section, Stat, StatusPill } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { formatDuration, formatINR } from '@/lib/format'
import { ExtendValidityForm } from '@/pages/subscriptions/components/ExtendValidityForm'
import { paymentsService, type PurchaseDetail } from '@/services/payments.service'
import { ACCESS_STATUS, DISPUTE, PAYMENT_STATUS, TYPE_LABEL, istDay, istDayTime, money, TWO_COLS } from './components/labels'
import { OpenCaseForm } from './components/OpenCaseForm'
import {
  AccessSection, Attempts, BoughtSection, CasesSection, ClaimWarning, DocumentsSection, MoneySection, StudentSection,
  TermsSection, TimelineSection, accessSummary, paymentFacts, purchaseTitle,
} from './components/PurchaseSections'
import { RevokeAccess } from './components/RevokeAccess'
import { useBack, useRecord } from './components/useRecord'

type Panel = 'extend' | 'revoke' | 'case' | null

/** Added 27 Nov 2026: a tester's INR 1 order, and a row a tester reset ended. */
type TestFacts = {
  is_test?: boolean
  ended_by_tester_reset?: boolean
  test?: { is_test: boolean; list_amount: number | null; coupon_code: string | null; reset_at: string | null; was_sale: boolean } | null
}

/** Everything about one purchase, of any type. */
export function PurchaseDetailPage() {
  const { type = '', id = '' } = useParams()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canPayments = hasPermission('payments.read')
  const back = useBack(canPayments ? { label: 'Purchases', href: '/commerce/purchases' } : { label: 'Subscriptions', href: '/users/subscriptions' })
  const { data: p, loading, error, reload } = useRecord(`${type}/${id}`, () => paymentsService.getPurchase(type, id))
  const [panel, setPanel] = useState<Panel>(null)
  const [checking, setChecking] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setPanel(null) }, [type, id])
  useEffect(() => {
    if (!panel) return
    panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    panelRef.current?.focus({ preventScroll: true })
  }, [panel])

  if (!p) {
    if (loading) return <DetailSkeleton />
    const missing = error?.status === 404 || error?.status === 400
    return <ErrorState title={missing ? 'This purchase was not found' : error?.status === 403 ? 'You cannot see this purchase' : undefined} message={missing ? 'It may have been removed, or the link is wrong.' : error?.message} onRetry={missing || error?.status === 403 ? undefined : reload} back={back} />
  }

  const title = purchaseTitle(p)
  const status = PAYMENT_STATUS[p.status]
  const access = accessSummary(p)
  const plan = p.tier.duration_days ? formatDuration(p.tier.duration_days) : p.tier.name
  const canExtend = p.capabilities.can_extend && hasPermission('users.update')
  const canRevoke = p.capabilities.can_revoke && hasPermission('users.update') && !!p.user_id && !!p.user
  const canCase = p.capabilities.can_open_case && canPayments && hasPermission('invoices.update')
  const done = () => { setPanel(null); reload() }
  // An unpaid order may have been paid with its confirmation lost (app closed, webhook missed)
  const canCheckGateway = ['pending', 'failed'].includes(p.status) && !p.bundled && !p.is_admin_granted && canPayments && hasPermission('invoices.update')
  const checkGateway = async () => {
    if (checking) return
    setChecking(true)
    try {
      const res = await apiService.post<{ result: string; payment_id?: string }>(`admin/payments/purchases/${p.type}/${p._id}/check-gateway`, {})
      const r = res.data?.result || ''
      const said: Record<string, [string, 'success' | 'info' | 'error']> = {
        activated: ['Zoho shows it was paid. The purchase is now active.', 'success'],
        paid_but_held: ['Zoho shows it was paid, but it needs a review. A payment case was opened.', 'info'],
        already_completed: ['This purchase is already active.', 'info'],
        zoho_not_connected: ['Zoho Payments is not connected here, so it cannot be checked.', 'error'],
        zoho_unreachable: ['Zoho did not answer. Try again in a minute.', 'error'],
        no_payment_session: ['This order never reached the payment page.', 'info'],
      }
      const [msg, tone] = said[r] || (r.startsWith('not_paid') || r.startsWith('payment_') ? ['Zoho shows no completed payment for this order.', 'info'] : [`Checked with Zoho (${r}).`, 'info'])
      if (tone === 'success') toast.success(msg); else if (tone === 'error') toast.error(msg); else toast(msg)
      reload()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not check with Zoho.'))
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-6">
      <DetailHeader
        back={back}
        title={title}
        status={
          <>
            {(p as PurchaseDetail & TestFacts).ended_by_tester_reset
              ? <StatusPill>Ended by tester reset</StatusPill>
              : <StatusPill tone={status?.tone}>{status?.label || p.status}</StatusPill>}
            {(p as PurchaseDetail & TestFacts).is_test && <StatusPill tone="warning">Test</StatusPill>}
            {p.dispute_status && <StatusPill tone={DISPUTE[p.dispute_status].tone}>{DISPUTE[p.dispute_status].label}</StatusPill>}
            {p.bundled && <StatusPill>Included with a combo</StatusPill>}
            {p.is_admin_granted && <StatusPill tone="info">Given by an admin</StatusPill>}
          </>
        }
        subtitle={<>{TYPE_LABEL[p.type]} {p.type === 'book' ? 'order' : 'purchase'} by {p.user?.name || 'a deleted account'}, {istDayTime(p.at)} IST</>}
        actions={
          <>
            {p.payment && !p.bundled && <Button asChild variant="outline"><Link to={`/commerce/payments/${p.type}/${p._id}`}><CreditCard aria-hidden="true" />Payment</Link></Button>}
            {canCheckGateway && <Button variant="outline" onClick={() => void checkGateway()} disabled={checking}>{checking ? <Loader2 aria-hidden="true" className="animate-spin" /> : <RefreshCw aria-hidden="true" />}{checking ? 'Checking…' : 'Check with Zoho'}</Button>}
            {canCase && <Button variant="outline" aria-expanded={panel === 'case'} onClick={() => setPanel(panel === 'case' ? null : 'case')}><ShieldAlert aria-hidden="true" />Open a case</Button>}
            {canExtend && <Button variant="outline" aria-expanded={panel === 'extend'} onClick={() => setPanel(panel === 'extend' ? null : 'extend')}><CalendarPlus aria-hidden="true" />Extend validity</Button>}
            {canRevoke && <Button variant="outline" className="text-danger hover:bg-danger-soft hover:text-danger" aria-expanded={panel === 'revoke'} onClick={() => setPanel(panel === 'revoke' ? null : 'revoke')}><UserX aria-hidden="true" />Revoke access</Button>}
          </>
        }
      />

      {error && <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">{error.message} Showing what was loaded before.<Button size="sm" variant="outline" onClick={reload}>Try again</Button></p>}
      <Notices p={p} />

      {panel && (
        <div ref={panelRef} tabIndex={-1} className="outline-none">
          {panel === 'revoke' && p.user && (
            <RevokeAccess key={p._id} userId={p.user._id} purchaseId={p._id} itemName={title} type={p.type as 'package' | 'ebook' | 'session'} onDone={done} onCancel={() => setPanel(null)} />
          )}
          {panel === 'extend' && (
            <Section title="Extend validity" description={`Ends ${istDay(p.access.end)} now.`}>
              <ExtendValidityForm purchaseId={p._id} expiresAt={p.access.end} includesPackages={p.access.bundled.length > 0} onExtended={done} onCancel={() => setPanel(null)} className="max-w-xl" />
            </Section>
          )}
          {panel === 'case' && (
            <Section title="Open a case on this purchase">
              <OpenCaseForm type={p.type} purchaseId={p._id} refundable={p.payment_status !== 'refunded'} onCancel={() => setPanel(null)} onOpened={(c) => navigate(`/commerce/cases/${c._id}`, { state: { back: { label: 'Purchase', href: `/commerce/purchases/${p.type}/${p._id}` } } })} />
            </Section>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total charged" value={money(p.money.charged, p.money.currency)} hint={p.money.coupon ? `Coupon ${p.money.coupon.code}` : p.money.charged === 0 ? 'Nothing was charged' : 'GST included'} />
        <Stat label={p.type === 'book' ? 'Order' : 'Access'} value={access.value} hint={access.hint} href={p.type === 'book' && hasPermission('book_orders.read') ? `/commerce/book-orders/${p._id}` : undefined} />
        <Stat label={plan ? 'Plan' : 'Type'} value={plan || TYPE_LABEL[p.type]} hint={p.item.subject?.name} />
        <Stat label="Invoice" value={p.documents.invoice?.invoice_number || 'None'} hint={p.documents.invoice ? formatINR(p.documents.invoice.amount) : undefined} href={p.documents.invoice && hasPermission('invoices.read') ? `/commerce/invoices/${p.documents.invoice._id}` : undefined} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <StudentSection user={p.user} userId={p.user_id} />
          <BoughtSection p={p} />
          <MoneySection p={p} />
          <AccessSection p={p} />
          {p.order && <OrderSection p={p} />}
          {p.payment && !p.bundled && (
            <Section title="Payment">
              <FactGrid facts={paymentFacts(p)} className={TWO_COLS} />
              <ClaimWarning p={p} />
              <Attempts p={p} />
            </Section>
          )}
          <DocumentsSection p={p} onChanged={reload} />
          <TermsSection p={p} />
        </div>
        <div className="min-w-0 space-y-6">
          <CasesSection p={p} />
          <TimelineSection items={p.timeline} />
        </div>
      </div>
    </div>
  )
}

/** The one or two things an admin should know before anything else. */
function Notices({ p }: { p: PurchaseDetail }) {
  const open = p.cases.find((c) => !c.resolved_at)
  const items: { tone: string; text: React.ReactNode }[] = []
  const test = (p as PurchaseDetail & TestFacts).test
  if (test?.is_test) items.push({ tone: 'bg-warning-soft text-warning', text: <>Test order by a tester account, charged the tester price. {test.list_amount != null ? `A real buyer would pay ${formatINR(test.list_amount)} before tax${test.coupon_code ? ` (coupon ${test.coupon_code} entered)` : ''}. ` : ''}Not a sale, no invoice.</> })
  if (test?.reset_at) items.push({ tone: 'bg-muted text-foreground', text: <>Ended by a tester reset on {istDay(test.reset_at)}. Kept for audit; the student no longer sees it.{test.was_sale ? ' It was a real sale when it was ended.' : ''}</> })
  if (open) items.push({ tone: 'bg-warning-soft text-warning', text: <>{open.case_number} is open on this purchase. <Link to={`/commerce/cases/${open._id}`} className="font-medium underline underline-offset-4">Go to the case</Link></> })
  if (p.refund) items.push({ tone: 'bg-danger-soft text-danger', text: <>Refunded{p.refund.at ? ` on ${istDay(p.refund.at)}` : ''}{p.refund.amount != null ? `, ${formatINR(p.refund.amount)}` : ''}. The student no longer has access.</> })
  else if (p.access.revoked && !test?.reset_at) items.push({ tone: 'bg-danger-soft text-danger', text: <>{ACCESS_STATUS.revoked.label}{p.access.revoked.at ? ` on ${istDay(p.access.revoked.at)}` : ''}{p.access.revoked.reason ? `: ${p.access.revoked.reason}` : '.'}</> })
  if (p.dispute_status === 'lost' && ['active', 'upcoming'].includes(p.access.status)) items.push({ tone: 'bg-warning-soft text-warning', text: 'The dispute was lost, but the student still has access.' })
  if (!items.length) return null
  return <div className="space-y-2">{items.map((i, n) => <p key={n} className={`rounded-lg px-4 py-2.5 text-sm ${i.tone}`}>{i.text}</p>)}</div>
}

function OrderSection({ p }: { p: PurchaseDetail }) {
  const { hasPermission } = useAuth()
  const o = p.order!
  return (
    <Section title="Shipping" action={hasPermission('book_orders.read') ? <Button asChild size="sm" variant="outline"><Link to={`/commerce/book-orders/${p._id}`}>Manage order</Link></Button> : undefined}>
      <FactGrid
        className={TWO_COLS}
        facts={[
          { label: 'Recipient', value: o.recipient_name },
          { label: 'Phone', value: o.shipping_phone, copy: o.shipping_phone, mono: true },
          { label: 'Address', value: o.shipping_address, wide: true },
          !!o.courier_name && { label: 'Courier', value: o.courier_name },
          !!o.tracking_number && { label: 'Tracking number', value: o.tracking_number, copy: o.tracking_number, mono: true },
        ]}
      />
    </Section>
  )
}
