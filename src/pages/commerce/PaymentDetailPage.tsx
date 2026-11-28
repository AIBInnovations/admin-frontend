import { Link, useParams } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton, DetailHeader, DetailSkeleton, ErrorState, FactGrid, Section, Stat, StatusPill } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { formatINR } from '@/lib/format'
import { paymentsService } from '@/services/payments.service'
import { DISPUTE, GATEWAY_LABEL, PAYMENT_STATUS, TYPE_LABEL, istDayTime, money, TWO_COLS } from './components/labels'
import { Attempts, CasesSection, ClaimWarning, StudentSection, TimelineSection, accessSummary, paymentFacts, purchaseHref, purchaseTitle } from './components/PurchaseSections'
import { useBack, useRecord } from './components/useRecord'

const MONEY_EVENTS = ['created', 'paid', 'failed', 'invoice', 'invoice_emailed', 'invoice_refreshed', 'coupon', 'case', 'case_closed', 'refund_recorded', 'access_approved']

/** One payment as the gateway sees it. What the student got is on the purchase. */
export function PaymentDetailPage() {
  const { type = '', id = '' } = useParams()
  const { hasPermission } = useAuth()
  const back = useBack({ label: 'Payments', href: '/commerce/payments' })
  const { data: p, loading, error, reload } = useRecord(`${type}/${id}`, () => paymentsService.getPurchase(type, id))

  if (!p) {
    if (loading) return <DetailSkeleton />
    const missing = error?.status === 404 || error?.status === 400
    return <ErrorState title={missing ? 'This payment was not found' : undefined} message={missing ? 'It may have been removed, or the link is wrong.' : error?.message} onRetry={missing ? undefined : reload} back={back} />
  }

  const pay = p.payment
  const status = PAYMENT_STATUS[p.payment_status]
  const noCheckout = /^(ADMIN_GRANT_|BUNDLE_)/.test(pay?.session_id || '')
  const invoice = p.documents.invoice
  const gap = invoice ? Math.round((invoice.amount - p.money.charged) * 100) / 100 : 0

  return (
    <div className="space-y-6">
      <DetailHeader
        back={back}
        title={pay?.payment_id
          ? <span className="inline-flex flex-wrap items-center gap-2"><span>Payment</span><span className="break-all font-mono text-[20px] sm:text-[23px]">{pay.payment_id}</span><CopyButton value={pay.payment_id} label="payment id" /></span>
          : noCheckout ? 'No payment' : 'Payment without an id'}
        status={<><StatusPill tone={status?.tone}>{status?.label || p.payment_status}</StatusPill>{p.dispute_status && <StatusPill tone={DISPUTE[p.dispute_status].tone}>{DISPUTE[p.dispute_status].label}</StatusPill>}</>}
        subtitle={<>{money(p.money.charged, p.money.currency)} for {purchaseTitle(p)}, {istDayTime(p.at)} IST</>}
        actions={<Button asChild><Link to={purchaseHref(p.type, p._id)}><ShoppingBag aria-hidden="true" />Open purchase</Link></Button>}
      />

      {error && <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">{error.message} Showing what was loaded before.<Button size="sm" variant="outline" onClick={reload}>Try again</Button></p>}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Charged at the gateway" value={money(p.money.charged, p.money.currency)} hint={p.money.charged_is_pre_tax ? 'Older record: before GST' : undefined} />
        <Stat label="Gateway" value={noCheckout ? 'None' : pay?.gateway ? GATEWAY_LABEL[pay.gateway] || pay.gateway : 'Not set'} />
        <Stat label="Invoice" value={invoice?.invoice_number || 'None'} hint={invoice ? formatINR(invoice.amount) : undefined} href={invoice && hasPermission('invoices.read') ? `/commerce/invoices/${invoice._id}` : undefined} />
        <Stat label={p.type === 'book' ? 'Order' : 'Access'} value={accessSummary(p).value} hint={accessSummary(p).hint} href={purchaseHref(p.type, p._id)} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Section title="At the gateway">
            {noCheckout && <p className="mb-4 rounded-lg bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">{p.bundled ? 'This row came with a combo, so it has no payment of its own.' : 'An admin gave this access, so there was no checkout.'}{p.access.combo_parent && <> <Link to={`/commerce/payments/package/${p.access.combo_parent._id}`} className="font-medium text-primary hover:underline">See the combo's payment</Link></>}</p>}
            <FactGrid facts={paymentFacts(p)} className={TWO_COLS} />
            <ClaimWarning p={p} />
            {invoice && gap > 0.5 && <p className="mt-4 text-sm text-muted-foreground">The invoice is {formatINR(gap)} more than this amount. That is the gateway fee the student paid.</p>}
            {invoice && gap < -0.5 && <p className="mt-4 rounded-lg bg-warning-soft px-3.5 py-2.5 text-sm text-warning">The invoice is {formatINR(-gap)} less than this amount. Check the invoice.</p>}
            <Attempts p={p} />
          </Section>
          <Section title="Purchase">
            <FactGrid
              className={TWO_COLS}
              facts={[
                { label: TYPE_LABEL[p.type], value: <Link to={purchaseHref(p.type, p._id)} className="font-medium text-primary hover:underline">{purchaseTitle(p)}</Link> },
                { label: 'Purchase id', value: p._id, copy: p._id, mono: true },
                !!p.money.coupon && { label: 'Coupon', value: `${p.money.coupon.code} (${formatINR(p.money.coupon.discount)} off)` },
                !!p.refund && { label: 'Refund', value: `${p.refund.amount != null ? formatINR(p.refund.amount) : 'Amount not recorded'}${p.refund.reference ? `, ${p.refund.reference}` : ''}` },
              ]}
            />
          </Section>
          <StudentSection user={p.user} userId={p.user_id} />
        </div>
        <div className="min-w-0 space-y-6">
          <CasesSection p={p} />
          <TimelineSection title="Payment timeline" items={p.timeline.filter((t) => MONEY_EVENTS.includes(t.kind))} />
        </div>
      </div>
    </div>
  )
}
