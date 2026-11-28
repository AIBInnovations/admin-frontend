import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/common/detail'
import { formatINR, subscriptionLabel } from '@/lib/format'
import { formatExpiry } from '@/lib/relativeTime'
import type { SubscriptionRecord } from '@/services/subscriptions.service'
import { ExtendValidityForm } from './ExtendValidityForm'
import { EXPIRY_TONE, TYPE_META } from './subscriptionType'

interface ExtendValidityPanelProps {
  record: SubscriptionRecord
  canExtend: boolean
  onClose: () => void
  /** Called after a successful extend with the new expiry ISO string. */
  onExtended: (newExpiry: string) => void
}

const ist = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })
const istDay = (iso: string | null | undefined) => (iso && !Number.isNaN(Date.parse(iso)) ? ist.format(new Date(iso)) : '—')

const NOT_EXTENDABLE: Record<string, string> = {
  session: 'Live session access is tied to the session date and cannot be extended.',
  workshop: 'Workshop access is tied to its dates and cannot be extended.',
  ebook: 'eBook purchases are lifetime, so there is no validity to extend.',
  form: 'A form has no validity to extend.',
}

/** The side panel on Subscriptions (and the drawer on a student's page). */
export function ExtendValidityPanel({ record, canExtend, onClose, onExtended }: ExtendValidityPanelProps) {
  const expiry = formatExpiry(record.expires_at)
  const meta = TYPE_META[record.type]
  const title = record.type === 'package' ? subscriptionLabel(record.item_name, record) : record.item_name || 'Deleted item'

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold">{record.user?.name || 'Deleted account'}</h2>
          <p className="mt-0.5 break-words text-[13px] text-muted-foreground">{title}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusPill>{meta.label}</StatusPill>
            <StatusPill tone={EXPIRY_TONE[expiry.status]}>{expiry.relative}</StatusPill>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" className="-mr-2 h-8 w-8 shrink-0" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></Button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <dl className="divide-y divide-border rounded-lg border border-border text-sm">
          <Row label={record.type === 'session' || record.type === 'workshop' ? 'Date' : 'Current end date'}>{record.expires_at ? istDay(record.expires_at) : 'Lifetime'}</Row>
          <Row label="Email">{record.user?.email || '—'}</Row>
          <Row label="Phone">{record.user?.phone_number || '—'}</Row>
          <Row label="Purchased">{istDay(record.purchased_at)}</Row>
          <Row label="Source">{record.from_combo ? 'Included with a combo' : record.is_admin_granted ? 'Admin granted' : 'Paid'}</Row>
          {record.tier_name && <Row label="Tier">{record.tier_name}</Row>}
          {!record.is_admin_granted && <Row label="Amount">{record.currency === 'INR' || !record.currency ? formatINR(record.amount_paid) : `${record.amount_paid} ${record.currency}`}</Row>}
        </dl>

        <Link to={`/commerce/purchases/${record.type}/${record.purchase_id}`} className="inline-block text-sm font-medium text-primary hover:underline">Open full details</Link>

        <div>
          <h3 className="text-sm font-semibold">Extend validity</h3>
          {!record.extendable ? (
            <p className="mt-2 rounded-lg bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">{NOT_EXTENDABLE[record.type] || 'This cannot be extended.'}</p>
          ) : !canExtend ? (
            <p className="mt-2 rounded-lg bg-warning-soft px-3.5 py-2.5 text-[13px] text-warning">You do not have permission to extend subscriptions (users.update).</p>
          ) : (
            <>
            {record.from_combo && <p className="mt-2 rounded-lg bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">This came with a combo. Extending it here changes this package only; extend the combo to move all of them.</p>}
            <ExtendValidityForm className="mt-3" purchaseId={record.purchase_id} expiresAt={record.expires_at} onExtended={onExtended} onCancel={onClose} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3.5 py-2">
      <dt className="shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm">{children}</dd>
    </div>
  )
}
