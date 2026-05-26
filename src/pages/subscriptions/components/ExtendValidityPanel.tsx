import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PanelShell } from '@/pages/explorer/panel/PanelShell'
import { PanelField, PanelTextarea, PanelSectionTitle } from '@/pages/explorer/panel/fields'
import { formatExpiry, formatDate, EXPIRY_BADGE_CLASS } from '@/lib/relativeTime'
import { subscriptionsService, type SubscriptionRecord } from '@/services/subscriptions.service'
import { TYPE_META } from './subscriptionType'

const QUICK_DAYS = [7, 30, 90]

interface ExtendValidityPanelProps {
  record: SubscriptionRecord
  canExtend: boolean
  onClose: () => void
  /** Called after a successful extend with the new expiry ISO string. */
  onExtended: (newExpiry: string) => void
}

const toDateInput = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ExtendValidityPanel({
  record,
  canExtend,
  onClose,
  onExtended,
}: ExtendValidityPanelProps) {
  const [quickDays, setQuickDays] = useState<number | null>(null)
  const [dateValue, setDateValue] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset the form whenever a different record is opened.
  useEffect(() => {
    setQuickDays(null)
    setDateValue('')
    setReason('')
  }, [record.purchase_id])

  const expiry = formatExpiry(record.expires_at)
  const isExpired = expiry.status === 'expired'
  const meta = TYPE_META[record.type]
  const TypeIcon = meta.icon
  const now = new Date()

  // Preview the resulting expiry date for the current choice.
  let previewDate: Date | null = null
  if (quickDays != null && record.expires_at != null) {
    // Day-based: from today when expired, else from current expiry (mirrors backend).
    const base = isExpired ? new Date(now) : new Date(record.expires_at)
    base.setDate(base.getDate() + quickDays)
    previewDate = base
  } else if (quickDays != null) {
    const base = new Date(now)
    base.setDate(base.getDate() + quickDays)
    previewDate = base
  } else if (dateValue) {
    previewDate = new Date(`${dateValue}T23:59:59`)
  }

  const editable = canExtend && record.extendable
  const canSave = editable && (quickDays != null || dateValue !== '')

  const resetForm = () => {
    setQuickDays(null)
    setDateValue('')
    setReason('')
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const body =
        quickDays != null
          ? { days: quickDays, reason: reason || undefined }
          : { new_expiry: new Date(`${dateValue}T23:59:59`).toISOString(), reason: reason || undefined }

      const res = await subscriptionsService.extend(record.purchase_id, body)
      if (res.success && res.data) {
        toast.success(res.message || 'Validity extended')
        onExtended(res.data.new_expiry)
        resetForm()
      } else {
        toast.error(res.message || 'Failed to extend validity')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to extend validity')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PanelShell
      icon={<TypeIcon className="w-5 h-5 text-blue-500" />}
      title={record.user?.name || 'Unknown user'}
      subtitle={record.item_name || 'Unknown item'}
      badges={
        <>
          <Badge className={cn('text-xs font-medium border-0', meta.badge)}>{meta.label}</Badge>
          <Badge className={cn('text-xs font-medium border-0', EXPIRY_BADGE_CLASS[expiry.status])}>
            {expiry.relative}
          </Badge>
        </>
      }
      onClose={onClose}
      saving={saving}
      dirty={canSave}
      canSave={canSave}
      saveLabel="Extend validity"
      onSave={editable ? handleSave : undefined}
      onCancel={resetForm}
    >
      {/* Summary */}
      <div className="space-y-3">
        <PanelSectionTitle>{meta.label}</PanelSectionTitle>
        <dl className="rounded-lg bg-slate-50/60 ring-1 ring-slate-200 divide-y divide-slate-100 text-sm">
          <Row label={record.type === 'session' ? 'Session date' : 'Current expiry'}>
            <span className="text-slate-700">{expiry.absolute}</span>
            {record.expires_at && <span className="text-slate-400"> · {expiry.relative}</span>}
          </Row>
          <Row label="Email">{record.user?.email || '—'}</Row>
          <Row label="Phone">{record.user?.phone_number || '—'}</Row>
          <Row label="Purchased">{formatDate(record.purchased_at)}</Row>
          <Row label="Source">{record.is_admin_granted ? 'Admin granted' : 'Paid'}</Row>
          {record.tier_name && <Row label="Tier">{record.tier_name}</Row>}
          {!record.is_admin_granted && (
            <Row label="Amount">
              {record.amount_paid?.toLocaleString('en-IN')} {record.currency}
            </Row>
          )}
        </dl>
      </div>

      {/* Extend */}
      <div className="space-y-3">
        <PanelSectionTitle>Extend validity</PanelSectionTitle>

        {!record.extendable ? (
          <p className="text-xs text-slate-500 bg-slate-50 ring-1 ring-slate-200 rounded-lg px-3 py-2">
            {record.type === 'session'
              ? 'Live session access is tied to the session date and cannot be extended.'
              : 'eBook purchases are lifetime — there is no validity to extend.'}
          </p>
        ) : !canExtend ? (
          <p className="text-xs text-amber-600 bg-amber-50 ring-1 ring-amber-200 rounded-lg px-3 py-2">
            You don't have permission to extend subscriptions (requires users.update).
          </p>
        ) : (
          <>
            <PanelField
              label="Quick extend"
              hint={isExpired ? 'Expired — counted from today.' : 'Added to the current expiry date.'}
            >
              <div className="flex flex-wrap gap-2">
                {QUICK_DAYS.map((d) => (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant={quickDays === d ? 'default' : 'outline'}
                    className={quickDays === d ? '' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}
                    onClick={() => {
                      setQuickDays(quickDays === d ? null : d)
                      setDateValue('')
                    }}
                  >
                    +{d} days
                  </Button>
                ))}
              </div>
            </PanelField>

            <PanelField label="Or set exact expiry date" htmlFor="new_expiry">
              <Input
                id="new_expiry"
                type="date"
                value={dateValue}
                min={toDateInput(new Date())}
                onChange={(e) => {
                  setDateValue(e.target.value)
                  setQuickDays(null)
                }}
                className="h-9 text-sm bg-slate-50/60 border-slate-200 focus-visible:bg-white [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </PanelField>

            <PanelField label="Reason" hint="Optional — logged with the change.">
              <PanelTextarea
                value={reason}
                onChange={setReason}
                placeholder="e.g. Payment delay, goodwill extension…"
              />
            </PanelField>

            {previewDate && (
              <div className="rounded-lg bg-blue-50 ring-1 ring-blue-200 px-3 py-2 text-sm text-blue-700">
                New expiry: <span className="font-medium">{formatDate(previewDate)}</span>
                <span className="text-blue-500"> · {formatExpiry(previewDate).relative}</span>
              </div>
            )}
          </>
        )}
      </div>
    </PanelShell>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2">
      <dt className="text-xs text-slate-400 shrink-0">{label}</dt>
      <dd className="text-sm text-slate-700 text-right min-w-0 truncate">{children}</dd>
    </div>
  )
}
