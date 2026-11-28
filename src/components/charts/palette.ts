import type { PackageKind, SaleType, SubjectColumn } from '@/services/analytics.service'

export const TYPE_NAME: Record<SaleType, string> = { package: 'Packages', session: 'Live sessions', workshop: 'Workshops', book: 'Books', ebook: 'E-books', form: 'Forms' }
export const TYPE_ONE: Record<SaleType, string> = { package: 'Package', session: 'Live session', workshop: 'Workshop', book: 'Book', ebook: 'E-book', form: 'Form' }
export const TYPE_ORDER: SaleType[] = ['package', 'session', 'workshop', 'book', 'ebook', 'form']
export const TYPE_COLOR: Record<SaleType, string> = {
  package: 'var(--chart-package)', session: 'var(--chart-session)', workshop: 'var(--chart-workshop)',
  book: 'var(--chart-book)', ebook: 'var(--chart-ebook)', form: 'var(--chart-form)',
}

export const KIND_NAME: Record<PackageKind, string> = { theory: 'Theory', practical: 'Practical', combo: 'Combo', other: 'Other packages' }
export const KIND_COLOR: Record<PackageKind, string> = { theory: 'var(--chart-theory)', practical: 'var(--chart-practical)', combo: 'var(--chart-combo)', other: 'var(--chart-other)' }

export const COLUMN_NAME: Record<SubjectColumn, string> = {
  theory: 'Theory', practical: 'Practical', combo: 'Combo', other_package: 'Other packages',
  session: 'Live sessions', workshop: 'Workshops', book: 'Books', ebook: 'E-books', form: 'Forms',
}

/** What a student did after a subscription ended, in the order the bar stacks them. */
export type Outcome = 'renewed' | 'via_combo' | 'switched' | 'other_only' | 'lapsed'
export const OUTCOME_ORDER: Outcome[] = ['renewed', 'via_combo', 'switched', 'other_only', 'lapsed']
export const OUTCOME_NAME: Record<Outcome, string> = {
  renewed: 'Renewed', via_combo: 'Renewed through a combo', switched: 'Moved to another package', other_only: 'Bought other products', lapsed: 'Nothing yet',
}
/** Label colour inside each block. */
export const OUTCOME_INK: Record<Outcome, string> = { renewed: '#ffffff', via_combo: '#ffffff', switched: '#ffffff', other_only: '#ffffff', lapsed: 'var(--out-lapsed-ink)' }
export const OUTCOME_COLOR: Record<Outcome, string> = {
  renewed: 'var(--out-renewed)', via_combo: 'var(--out-combo)', switched: 'var(--out-switched)', other_only: 'var(--out-other)', lapsed: 'var(--out-lapsed)',
}

/** One cobalt hue for magnitude: step 0 is nothing, 1 to 7 light to dark. */
export const SEQ_STEPS = 7
export const seqColor = (step: number) => `var(--seq-${Math.max(0, Math.min(SEQ_STEPS, step))})`
export const seqInk = (step: number) => (step <= 0 ? 'hsl(var(--muted-foreground))' : `var(--seq-ink-${Math.min(SEQ_STEPS, step)})`)
/** The step for a value against the largest one. Any value above zero gets at least step 1. */
export function seqStep(value: number, max: number): number {
  if (!(value > 0) || !(max > 0)) return 0
  return Math.max(1, Math.min(SEQ_STEPS, Math.ceil((value / max) * SEQ_STEPS)))
}
export const ORDINAL = ['var(--ord-1)', 'var(--ord-2)', 'var(--ord-3)']
