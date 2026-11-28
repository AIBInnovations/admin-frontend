import { cn } from '@/lib/utils'
import { CouponLike, conditionLines, discountDetail, discountHeadline, targetLines, scopeSummary } from '@/lib/couponCopy'

export type CouponState = 'live' | 'paused' | 'expired' | 'used_up' | 'draft'

export function couponState(c: { is_active?: boolean; expiry_at?: string | null; max_redemptions?: number | null; redemption_count?: number }, draft = false): CouponState {
  if (draft) return 'draft'
  if (c.expiry_at && new Date(c.expiry_at).getTime() < Date.now()) return 'expired'
  if (c.max_redemptions != null && (c.redemption_count || 0) >= c.max_redemptions) return 'used_up'
  if (c.is_active === false) return 'paused'
  return 'live'
}

const STATE_LABEL: Record<CouponState, string> = {
  live: 'Live',
  paused: 'Paused',
  expired: 'Expired',
  used_up: 'Used up',
  draft: 'Preview',
}

export const STATE_CLASS: Record<CouponState, string> = {
  live: 'bg-success-soft text-success',
  paused: 'bg-muted text-muted-foreground',
  expired: 'bg-danger-soft text-danger',
  used_up: 'bg-warning-soft text-warning',
  draft: 'bg-accent text-accent-foreground',
}

export function CouponStatePill({ state, className }: { state: CouponState; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold', STATE_CLASS[state], className)}>
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full bg-current', state === 'live' && 'animate-pulse')} />
      {STATE_LABEL[state]}
    </span>
  )
}

/**
 * The discount on the stub never breaks inside the number ("₹1,50" / "0").
 * It stays on one line and its size follows the stub's width (container
 * units): the full 44px when it fits, smaller for long amounts in the narrow
 * editor preview. Widths are in em of the display face, a little generous.
 */
function headlineSize(text: string): string {
  let em = 0
  for (const ch of text) em += /[0-9₹]/.test(ch) ? 0.62 : ch === '%' ? 0.9 : ch === ',' || ch === '.' ? 0.3 : ch === '—' ? 1 : 0.66
  em = Math.max(1, em * 1.06)
  return `min(44px, calc(100cqi / ${em.toFixed(3)}))`
}

interface CouponTicketProps {
  coupon: CouponLike & { code: string; is_active?: boolean; redemption_count?: number }
  state: CouponState
  /** Show every targeted product instead of the one-line summary. */
  expanded?: boolean
  className?: string
}

/**
 * The coupon as a ticket: discount on the stub, code and rules on the body.
 * It is the editor's live preview and the detail page's header, so an admin
 * always sees, in plain words, exactly who gets the discount.
 */
export function CouponTicket({ coupon, state, expanded, className }: CouponTicketProps) {
  const lines = targetLines(coupon)
  const conditions = conditionLines(coupon)
  const headline = discountHeadline(coupon)
  return (
    <figure
      aria-label={`Coupon ${coupon.code || 'preview'}`}
      className={cn('pg-ticket relative flex flex-col overflow-hidden rounded-xl bg-card shadow-raised ring-1 ring-border sm:flex-row', className)}
    >
      {/* Stub */}
      <div
        className="@container relative flex shrink-0 flex-col justify-between gap-6 p-5 text-white sm:w-[38%]"
        style={{ backgroundImage: 'linear-gradient(150deg, #0000C8 0%, #0000C8 55%, #0A5BE6 80%, #00BEFA 130%)' }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">PGME coupon</span>
        <div>
          <p className="font-display text-[44px] font-bold leading-none tracking-[-0.03em] whitespace-nowrap tabular-nums" style={{ fontSize: headlineSize(headline) }} title={headline} data-numeric>{headline}</p>
          <p className="mt-1.5 text-sm text-white/80">{discountDetail(coupon)}</p>
        </div>
      </div>

      {/* Perforation: notches top and bottom, dashed rule between */}
      <div aria-hidden="true" className="pg-perf hidden sm:block" />

      {/* Body */}
      <figcaption className="flex min-w-0 flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <p
            translate="no"
            className={cn(
              'min-w-0 font-mono font-semibold leading-tight text-foreground [overflow-wrap:anywhere]',
              // Shrink long codes so they stay on one line in the ticket body
              (coupon.code || '').length > 12 ? 'text-[15px] tracking-[0.02em]' : (coupon.code || '').length > 9 ? 'text-[18px] tracking-[0.04em]' : 'text-[22px] tracking-[0.06em]',
            )}
          >
            {coupon.code || 'CODE'}
          </p>
          <CouponStatePill state={state} className="mt-1 shrink-0" />
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Applies to</p>
          {expanded && coupon.applies_to === 'products' && lines.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {lines.map((l) => <li key={l} className="text-sm font-medium leading-snug">{l}</li>)}
            </ul>
          ) : (
            <p className="mt-1 text-sm font-medium leading-snug">{scopeSummary(coupon)}</p>
          )}
        </div>

        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-dashed border-border pt-3 text-xs text-muted-foreground">
          {conditions.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </figcaption>
    </figure>
  )
}
