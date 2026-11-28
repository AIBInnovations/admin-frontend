import { CopyButton } from '@/components/common/detail'
import { cn } from '@/lib/utils'

/**
 * Product ID (Aviraj, 28 Nov 2026): PGMEP001 package, PGMEB001 book,
 * PGMEL001 live session, PGMEW001 workshop, PGMER001 registration form. Given
 * automatically, never changed, never reused. Products from before the IDs
 * existed show "Not assigned yet" until the backfill has run.
 */
export function ProductCode({ code, className }: { code?: string | null; className?: string }) {
  if (!code) {
    return <span className={cn('whitespace-nowrap text-xs text-muted-foreground', className)} title="Given when the product IDs are filled in">Product ID not assigned yet</span>
  }
  return (
    <span
      title="Product ID"
      className={cn('inline-flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-card py-0.5 pl-2 pr-0.5 align-middle font-mono text-[13px] font-medium tabular-nums text-foreground', className)}
    >
      {code}<CopyButton value={code} label="Product ID" />
    </span>
  )
}

/** The same in a table cell or under a name: plain text, no copy button. */
export function ProductCodeText({ code, className }: { code?: string | null; className?: string }) {
  if (!code) return null
  return <span className={cn('whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground', className)} title="Product ID">{code}</span>
}
