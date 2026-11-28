import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download, Loader2, Mail, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DetailHeader, DetailSkeleton, ErrorState, FactGrid, Section, Stat, StatusPill } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { formatINR, subscriptionLabel } from '@/lib/format'
import { invoicesService } from '@/services/invoices.service'
import { INVOICE_STATUS, PAYMENT_STATUS, TYPE_LABEL, istDay, istDayTime, TWO_COLS } from './components/labels'
import { StudentSection, purchaseHref } from './components/PurchaseSections'
import { useInvoiceActions } from './components/useInvoiceActions'
import { useBack, useRecord } from './components/useRecord'

const address = (a?: Record<string, string>) => (a ? [a.street, a.street2, a.city, a.state, a.pincode, a.country].filter((v) => v && String(v).trim()) : [])

export function InvoiceDetailPage() {
  const { invoiceId = '' } = useParams()
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('invoices.update')
  const back = useBack({ label: 'Invoices', href: '/commerce/invoices' })
  const { data: inv, loading, error, reload } = useRecord(invoiceId, async () => {
    const res = await invoicesService.getById(invoiceId)
    return res.data!
  })
  const actions = useInvoiceActions(reload)
  const [confirmEmail, setConfirmEmail] = useState(false)

  if (!inv) {
    if (loading) return <DetailSkeleton />
    const missing = error?.status === 404 || error?.status === 400
    return <ErrorState title={missing ? 'This invoice was not found' : undefined} message={missing ? 'It may have been removed, or the link is wrong.' : error?.message} onRetry={missing ? undefined : reload} back={back} />
  }

  const status = INVOICE_STATUS[inv.payment_status]
  const busy = actions.busy?.action ?? null
  const billing = address(inv.billing_address)
  const shipping = address(inv.shipping_address)
  const purchaseLabel = inv.purchase ? (inv.purchase.type === 'package' ? subscriptionLabel(inv.purchase.item_name, inv.purchase) : inv.purchase.item_name) : null
  const noPdf = !inv.zoho_connected ? 'Zoho Books is not connected' : !inv.zoho_invoice_id ? 'Not linked to Zoho Books' : null

  return (
    <div className="space-y-6">
      <DetailHeader
        back={back}
        title={<span className="break-all font-mono text-[20px] sm:text-[23px]">{inv.invoice_number}</span>}
        status={<StatusPill tone={status?.tone}>{status?.label || inv.payment_status}</StatusPill>}
        subtitle={<>{formatINR(inv.amount)} to {inv.user?.name || 'a deleted account'}, {istDayTime(inv.createdAt)} IST</>}
        actions={
          <>
            {canUpdate && (
              <Button variant="outline" onClick={() => actions.regenerate(inv)} disabled={busy !== null || !!noPdf} title={noPdf || undefined}>
                {busy === 'regenerate' ? <Loader2 aria-hidden="true" className="animate-spin" /> : <RefreshCw aria-hidden="true" />}{busy === 'regenerate' ? 'Regenerating…' : 'Regenerate'}
              </Button>
            )}
            {canUpdate && (
              <Button variant="outline" onClick={() => setConfirmEmail(true)} disabled={busy !== null || !!noPdf || !inv.user?.email || confirmEmail} title={noPdf || (!inv.user?.email ? 'The student has no email address' : undefined)}>
                {busy === 'email' ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Mail aria-hidden="true" />}{busy === 'email' ? 'Emailing…' : 'Email again'}
              </Button>
            )}
            <Button onClick={() => actions.download(inv)} disabled={busy !== null || !!noPdf} title={noPdf || undefined}>
              {busy === 'pdf' ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}{busy === 'pdf' ? 'Downloading…' : 'Download PDF'}
            </Button>
          </>
        }
      />

      {!inv.zoho_connected && <p className="rounded-lg bg-warning-soft px-4 py-2.5 text-sm text-warning">Zoho Books is not connected, so the PDF, regenerating and emailing are not available right now.</p>}
      {inv.zoho_connected && !inv.zoho_invoice_id && <p className="rounded-lg bg-warning-soft px-4 py-2.5 text-sm text-warning">This invoice is not linked to Zoho Books, so it has no PDF.</p>}
      {error && <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">{error.message} Showing what was loaded before.<Button size="sm" variant="outline" onClick={reload}>Try again</Button></p>}

      {confirmEmail && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning-soft px-4 py-3">
          <span className="text-sm text-warning">Zoho Books emails this invoice to {inv.user?.email} now. Continue?</span>
          <span className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setConfirmEmail(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { setConfirmEmail(false); actions.email(inv) }}>Email invoice</Button>
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total" value={formatINR(inv.amount)} hint="GST included" />
        <Stat label="GST" value={formatINR(inv.gst_amount)} />
        <Stat label="Before GST" value={formatINR(Math.round((inv.amount - inv.gst_amount) * 100) / 100)} />
        <Stat label="Payment recorded" value={inv.payment_recorded_at ? istDay(inv.payment_recorded_at) : 'Not yet'} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Section title="Lines" flush description={inv.line_items_source === 'zoho' ? 'From Zoho Books.' : inv.line_items ? 'From our purchase record, before GST. The invoice in Zoho Books is the final word.' : undefined}>
            {inv.line_items ? (
              <div className="pg-scroll-x overflow-x-auto border-t border-border">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-5 py-2.5 font-medium">Item</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">Quantity</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">Rate</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">Discount</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inv.line_items.map((l, i) => (
                      <tr key={i} className="align-top">
                        <td className="px-5 py-3"><p className="font-medium">{l.name}</p>{l.description && l.description !== l.name && <p className="text-xs text-muted-foreground">{l.description}</p>}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{l.quantity}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">{formatINR(l.rate)}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">{l.discount > 0 ? formatINR(l.discount) : 'None'}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">{formatINR(l.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 pb-5 text-sm text-muted-foreground">{inv.description || 'The lines are only in Zoho Books.'}</p>
            )}
          </Section>

          <Section title="Invoice">
            <FactGrid
              className={TWO_COLS}
              facts={[
                { label: 'Invoice number', value: inv.invoice_number, copy: inv.invoice_number, mono: true },
                { label: 'Type', value: TYPE_LABEL[inv.purchase_type] || inv.purchase_type },
                { label: 'Created', value: `${istDayTime(inv.createdAt)} IST` },
                { label: 'Payment recorded', value: inv.payment_recorded_at ? `${istDayTime(inv.payment_recorded_at)} IST` : null },
                { label: 'Payment id', value: inv.zoho_payment_id, copy: inv.zoho_payment_id, mono: true },
                { label: 'Zoho invoice id', value: inv.zoho_invoice_id, copy: inv.zoho_invoice_id, mono: true },
                { label: 'Place of supply', value: inv.place_of_supply },
                !!inv.last_emailed_at && { label: 'Emailed again', value: `${istDayTime(inv.last_emailed_at)} IST to ${inv.last_emailed_to}` },
                !!inv.created_by_admin_name && { label: 'Made by hand by', value: inv.created_by_admin_name },
                billing.length > 0 && { label: 'Billing address', value: billing.join(', '), wide: true },
                shipping.length > 0 && { label: 'Shipping address', value: shipping.join(', '), wide: true },
              ]}
            />
          </Section>
        </div>

        <div className="min-w-0 space-y-6">
          <Section title="Purchase">
            {inv.purchase ? (
              <div className="text-sm">
                {hasPermission('payments.read') ? <Link to={purchaseHref(inv.purchase.type, inv.purchase._id)} className="font-medium text-primary hover:underline">{purchaseLabel}</Link> : <span className="font-medium">{purchaseLabel}</span>}
                <p className="mt-1 text-muted-foreground">{formatINR(inv.purchase.charged)} charged, {istDay(inv.purchase.at)}</p>
                <div className="mt-2"><StatusPill tone={PAYMENT_STATUS[inv.purchase.status]?.tone}>{PAYMENT_STATUS[inv.purchase.status]?.label || inv.purchase.status}</StatusPill></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{inv.purchase_missing ? 'The purchase this invoice was for no longer exists.' : 'This invoice was made by hand and has no purchase.'}</p>
            )}
          </Section>
          <StudentSection narrow user={inv.user} userId={null} />
        </div>
      </div>
    </div>
  )
}
