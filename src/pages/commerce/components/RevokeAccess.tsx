import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDay, formatINR } from '@/lib/format'
import { apiErrorInfo, apiErrorMessage } from '@/components/common/detail'
import { apiService } from '@/services/api.service'

export interface RevokeResult {
  purchase_id: string
  revoked_at: string
  bundled_revoked_purchase_ids?: string[]
  also_revoked_purchase_ids?: string[]
  restarted_purchases?: { purchase_id: string; expires_at: string }[]
}

interface OtherPurchase {
  purchase_id: string
  tier_name: string | null
  amount_paid: number
  purchased_at: string
  expires_at: string
  is_admin_granted: boolean
  from_combo: boolean
}

interface RevokeAccessProps {
  userId: string
  purchaseId: string
  /** Shown in the question, e.g. "TECOM Theory Package · 6 months subscription". */
  itemName: string
  /** Default: a package subscription. */
  type?: 'package' | 'ebook' | 'session'
  /** Prefills the reason, e.g. from a dispute. */
  defaultReason?: string
  onDone: (result: RevokeResult) => void
  onCancel: () => void
  className?: string
}

const PATH = { package: 'purchases', ebook: 'ebook-purchases', session: 'session-purchases' } as const

/**
 * Ends a student's access. Sits inside a page or a side panel (never a popup).
 *
 * A package can have other live purchases for the same student, usually a
 * renewal bought early and stacked after this one. The server then answers
 * 409 OTHER_ACTIVE_PURCHASES and the admin chooses what happens to them.
 */
export function RevokeAccess({ userId, purchaseId, itemName, type = 'package', defaultReason = '', onDone, onCancel, className }: RevokeAccessProps) {
  const [reason, setReason] = useState(defaultReason)
  const [others, setOthers] = useState<OtherPurchase[] | null>(null)
  const [choice, setChoice] = useState<'revoke' | 'keep' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const choicesRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (others) choicesRef.current?.focus() }, [others])

  const submit = async () => {
    if (saving || (others && !choice)) return
    setSaving(true)
    setError(null)
    try {
      const res = await apiService.put<RevokeResult>(`admin/users/${userId}/${PATH[type]}/${purchaseId}/revoke`, {
        reason: reason.trim() || undefined,
        ...(type === 'package' && choice ? { other_rows: choice } : {}),
      })
      const result = res.data as RevokeResult
      const also = result.also_revoked_purchase_ids?.length || 0
      const restarted = result.restarted_purchases?.length || 0
      toast.success(
        also ? `Access revoked, with ${also} other purchase${also === 1 ? '' : 's'}`
          : restarted ? 'Access revoked. The renewal restarts today.'
            : 'Access revoked',
      )
      onDone(result)
    } catch (e) {
      const { code, details } = apiErrorInfo<{ other_active_purchases?: OtherPurchase[] }>(e)
      if (code === 'OTHER_ACTIVE_PURCHASES' && Array.isArray(details?.other_active_purchases)) {
        setOthers(details.other_active_purchases)
        setChoice(null)
      } else {
        setError(apiErrorMessage(e))
      }
    } finally {
      setSaving(false)
    }
  }

  const many = (others?.length || 0) > 1

  return (
    <section aria-labelledby="revoke-title" className={cn('rounded-xl border border-danger/30 bg-card p-5 shadow-card', className)}>
      <h2 id="revoke-title" className="text-[15px] font-semibold">Revoke access to {itemName}?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The student loses access now. Packages included with a combo end too. This does not return any money.
      </p>

      <div className="mt-4">
        <label htmlFor="revoke-reason" className="text-sm font-medium">Reason</label>
        <Textarea
          id="revoke-reason"
          className="mt-1.5"
          rows={3}
          maxLength={500}
          value={reason}
          disabled={saving}
          onChange={(e) => setReason(e.target.value)}
          placeholder="For example: bank dispute lost, refund agreed with the student"
        />
        <p className="mt-1 text-xs text-muted-foreground">Kept on the purchase record.</p>
      </div>

      {others && (
        <div ref={choicesRef} tabIndex={-1} className="mt-5 outline-none" aria-live="polite">
          <p className="text-sm font-medium">
            This student has {others.length} other active purchase{many ? 's' : ''} of this package
          </p>
          <ul className="mt-2 max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {others.map((o) => (
              <li key={o.purchase_id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3.5 py-2.5 text-sm">
                <span className="font-medium">
                  {o.from_combo ? 'Included with a combo' : o.tier_name || (o.is_admin_granted ? 'Given by an admin' : 'Subscription')}
                </span>
                <span className="text-muted-foreground">
                  {o.amount_paid > 0 ? `${formatINR(o.amount_paid)}, ` : ''}bought {formatDay(o.purchased_at)}, ends {formatDay(o.expires_at)}
                </span>
              </li>
            ))}
          </ul>
          <fieldset className="mt-4 space-y-2" disabled={saving}>
            <legend className="sr-only">What should happen to the other purchases?</legend>
            <Choice
              checked={choice === 'revoke'}
              onSelect={() => setChoice('revoke')}
              title="Revoke everything"
              text={many ? 'All of them end now. The student loses this package completely.' : 'Both end now. The student loses this package completely.'}
            />
            <Choice
              checked={choice === 'keep'}
              onSelect={() => setChoice('keep')}
              title="Keep the renewal (it restarts today)"
              text="Only this purchase ends. A renewal that was waiting behind it starts today with its full paid length."
            />
          </fieldset>
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Keep access</Button>
        <Button type="button" variant="destructive" onClick={submit} disabled={saving || (!!others && !choice)}>
          {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
          {saving ? 'Revoking…' : choice === 'revoke' ? 'Revoke everything' : choice === 'keep' ? 'Revoke this one only' : 'Revoke access'}
        </Button>
      </div>
    </section>
  )
}

function Choice({ checked, onSelect, title, text }: { checked: boolean; onSelect: () => void; title: string; text: string }) {
  return (
    <label className={cn('flex cursor-pointer gap-3 rounded-lg border px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[hsl(var(--ring))]', checked ? 'border-primary bg-accent' : 'border-border hover:bg-muted/60')}>
      <input type="radio" name="other-rows" className="mt-1 accent-[hsl(var(--primary))] focus-visible:outline-none" checked={checked} onChange={onSelect} />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground">{text}</span>
      </span>
    </label>
  )
}
