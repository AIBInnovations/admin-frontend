import { Link } from 'react-router-dom'
import { StatusPill } from '@/components/common/detail'
import { subscriptionLabel } from '@/lib/format'
import type { Transaction } from '@/services/payments.service'
import { DISPUTE, PAYMENT_STATUS, istDay, money } from './labels'
import { DELETED_STUDENT, StudentLink } from '@/components/students/StudentLink'

/** Small pieces the purchase and payment lists share. */

/** The student's name opens the student; the row opens the purchase. */
export function StudentCell({ user, detail = 'email', from }: { user: Transaction['user']; detail?: 'email' | 'phone'; from?: string }) {
  if (!user) return <span className="text-sm text-muted-foreground">{DELETED_STUDENT}</span>
  return (
    <div className="min-w-[130px] max-w-[190px]">
      <p className="truncate text-sm"><StudentLink student={user} from={from} /></p>
      <p className="truncate text-xs text-muted-foreground" title={user.email || user.phone_number}>{(detail === 'phone' ? user.phone_number : user.email) || user.phone_number || user.email || '—'}</p>
    </div>
  )
}

export function ItemCell({ tx }: { tx: Transaction }) {
  const label = tx.purchase_type === 'package' ? subscriptionLabel(tx.item_name, tx) : tx.item_name
  const sub = tx.bundled ? 'Included with a combo' : tx.is_admin_granted ? 'Given by an admin' : tx.item_detail
  return (
    <div className="min-w-[170px] max-w-[250px]">
      <p className={`line-clamp-3 text-sm leading-snug ${tx.item_deleted ? 'text-muted-foreground' : ''}`} title={label}>{label}</p>
      {sub && <p className="truncate text-xs text-muted-foreground" title={sub}>{sub}</p>}
    </div>
  )
}

export function StatusCell({ tx }: { tx: Transaction }) {
  const key = tx.is_revoked && tx.payment_status === 'completed' ? 'revoked' : tx.payment_status
  const s = PAYMENT_STATUS[key] || { label: key, tone: 'neutral' as const }
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusPill tone={s.tone}>{s.label}</StatusPill>
      {tx.dispute_status && <StatusPill tone={DISPUTE[tx.dispute_status].tone}>{DISPUTE[tx.dispute_status].label}</StatusPill>}
      {!tx.dispute_status && tx.open_case && (
        <Link to={`/commerce/cases/${tx.open_case._id}`} className="text-xs font-medium text-primary hover:underline">{tx.open_case.case_number} open</Link>
      )}
    </div>
  )
}

export function AmountCell({ tx }: { tx: Transaction }) {
  return (
    <div className="whitespace-nowrap">
      <span className="text-sm font-medium tabular-nums">{money(tx.amount, tx.currency)}</span>
      {tx.coupon_code && <p className="max-w-[100px] truncate font-mono text-xs text-muted-foreground" title={`Coupon ${tx.coupon_code}`}>{tx.coupon_code}</p>}
    </div>
  )
}

export function DateCell({ iso }: { iso: string | null | undefined }) {
  return <span className="whitespace-nowrap text-xs text-muted-foreground">{istDay(iso) || '—'}</span>
}
