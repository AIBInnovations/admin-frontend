import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { BookOpen, Calendar, Gift, Package as PackageIcon } from 'lucide-react'
import { Section } from '@/components/common/detail'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDuration, formatINR, subscriptionLabel } from '@/lib/format'
import { usersService, type UserDetail } from '@/services/users.service'
import { packagesService, type Package } from '@/services/packages.service'
import { booksService, type Book } from '@/services/books.service'
import { liveSessionsService, type LiveSession } from '@/services/liveSessions.service'
import { ChoiceCards, EditorBar, Field, Notice, SearchSelect, personName } from './kit'
import { dayIST, dayTimeIST, ensureOk, errText, focusFirstError, plural, unwrap, useEditorGuard, useResource } from './lib'

export type GrantType = 'package' | 'ebook' | 'session'

export const GRANT_TYPES: { value: GrantType; label: string; title: string; description: string; icon: typeof PackageIcon }[] = [
  { value: 'package', label: 'Package', title: 'Grant Package Access', description: 'Give the user access to a content package with a specific duration.', icon: PackageIcon },
  { value: 'ebook', label: 'Ebook', title: 'Grant Ebook Access', description: 'Give the user perpetual access to an ebook. Optionally create an invoice.', icon: BookOpen },
  { value: 'session', label: 'Live Session', title: 'Grant Live Session Access', description: 'Give the user access to a live session with guaranteed enrollment. Optionally create an invoice.', icon: Calendar },
]

const GST_RATE = 0.18

const schema = z.object({
  item_id: z.string(),
  tier_index: z.string().optional(),
  duration_days: z.number({ error: 'Enter the number of days' }).int('Use whole days').min(1, 'Min 1 day').max(3650, 'Max 3650 days'),
  create_invoice: z.boolean(),
  invoice_amount: z.number({ error: 'Enter an amount' }).min(0, 'Enter an amount').or(z.nan()),
  is_inclusive_tax: z.boolean(),
  reason: z.string().max(500, 'Keep the reason under 500 characters'),
  notes: z.string().max(1000, 'Keep the notes under 1000 characters'),
})
type Values = z.infer<typeof schema>

const EMPTY: Values = { item_id: '', tier_index: undefined, duration_days: 365, create_invoice: false, invoice_amount: 0, is_inclusive_tax: false, reason: '', notes: '' }

type Item = { kind: 'package'; value: Package } | { kind: 'ebook'; value: Book } | { kind: 'session'; value: LiveSession }

async function loadItems(type: GrantType): Promise<Item[]> {
  if (type === 'package') return unwrap(await packagesService.getAll({ is_active: true, limit: 100 })).entities.map((value) => ({ kind: 'package', value }))
  if (type === 'ebook') return unwrap(await booksService.getAll({ is_available: true, limit: 100 })).entities.filter((b) => b.ebook).map((value) => ({ kind: 'ebook', value }))
  return unwrap(await liveSessionsService.getAll({ limit: 100, upcoming: true })).entities.map((value) => ({ kind: 'session', value }))
}

const refName = (v: unknown) => (v && typeof v === 'object' && 'name' in v ? String((v as { name: unknown }).name) : '')
const itemTitle = (i: Item) => (i.kind === 'package' ? i.value.name : i.value.title)

/** Sale price when there is one, else the price. */
const priceOf = (v: { price: number; is_on_sale?: boolean; sale_price?: number | null }) => (v.is_on_sale && v.sale_price ? v.sale_price : v.price ?? 0)

/** What this student already has of the chosen item, so a refusal is no surprise. */
function existingAccess(user: UserDetail, item: Item | undefined): { text: string; tone: 'warning' | 'info' } | null {
  if (!item) return null
  const id = item.value._id
  const same = (ref: unknown) => (ref && typeof ref === 'object' ? (ref as { _id?: string })._id : ref) === id
  const rows = item.kind === 'package' ? (user.purchases || []).filter((p) => same(p.package_id))
    : item.kind === 'ebook' ? (user.ebook_purchases || []).filter((p) => same(p.book_id))
      : (user.session_purchases || []).filter((p) => same(p.session_id))
  const active = rows.find((p) => p.payment_status === 'completed' && p.is_active && !p.is_revoked)
  if (active) {
    const ends = (active as { expires_at?: string }).expires_at
    return { tone: 'warning', text: `This student already has it${ends ? ` (ends ${dayIST(ends)})` : ''}. The server will refuse a second grant${item.kind === 'package' ? '; extend the existing one from their page instead' : ''}.` }
  }
  if (rows.some((p) => p.is_revoked)) return { tone: 'info', text: 'This was revoked before. Granting it again turns the old purchase back on.' }
  return null
}

interface GrantFormProps {
  user: UserDetail
  type: GrantType
  /** Where Cancel and a successful grant go. */
  doneHref: string
}

/** One grant form for packages, e-books and live sessions. Key it by type. */
export function GrantForm({ user, type, doneHref }: GrantFormProps) {
  const meta = GRANT_TYPES.find((t) => t.value === type)!
  const formRef = useRef<HTMLFormElement>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { data: items, loading, error: listError, reload } = useResource<Item[]>(() => loadItems(type), [type])

  const { register, handleSubmit, control, watch, setValue, setError, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: EMPTY, shouldFocusError: false,
  })
  const leave = useEditorGuard(isDirty && !isSubmitting)
  const v = watch()
  const item = items?.find((i) => i.value._id === v.item_id)
  const pkg = item?.kind === 'package' ? item.value : null
  // tier_index is the position in the saved list, so keep it when sorting for display
  const tiers = useMemo(() => (pkg?.tiers || []).map((t, index) => ({ ...t, index })).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.duration_days - b.duration_days), [pkg])
  const tier = v.tier_index !== undefined ? tiers.find((t) => String(t.index) === v.tier_index) : undefined
  const defaultPrice = tier ? tier.price ?? 0 : item ? (item.kind === 'session' ? item.value.price ?? 0 : priceOf(item.value)) : 0
  const bundled = (pkg?.bundled_package_ids || []).filter(Boolean)
  const days = Number.isFinite(v.duration_days) && v.duration_days > 0 ? v.duration_days : 0
  const endsOn = days ? new Date(Date.now() + days * 86_400_000) : null
  const amount = Number.isFinite(v.invoice_amount) ? v.invoice_amount : 0
  const base = v.is_inclusive_tax ? amount / (1 + GST_RATE) : amount
  const total = v.is_inclusive_tax ? amount : amount * (1 + GST_RATE)
  const known = existingAccess(user, item)

  // A new item brings its own length and price
  useEffect(() => {
    if (!item) return
    if (item.kind === 'package') {
      setValue('tier_index', undefined)
      setValue('duration_days', item.value.duration_days || 365)
    }
    setValue('invoice_amount', item.kind === 'session' ? item.value.price ?? 0 : priceOf(item.value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.value._id])

  useEffect(() => {
    if (!tier) return
    setValue('duration_days', tier.duration_days, { shouldValidate: true })
    setValue('invoice_amount', tier.price ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier?.index, pkg?._id])

  const onSubmit = async (data: Values) => {
    setSubmitError(null)
    let bad = false
    if (!item) { setError('item_id', { message: `${meta.label === 'Live Session' ? 'Session' : meta.label} is required` }); bad = true }
    if (pkg && tiers.length > 0 && !tier) { setError('tier_index', { message: 'Choose which length to give' }); bad = true }
    if (data.create_invoice && !(amount > 0)) { setError('invoice_amount', { message: 'Invoice amount must be greater than 0 when creating an invoice' }); bad = true }
    if (bad || !item) { focusFirstError(formRef.current); return }

    const invoice = data.create_invoice && amount > 0 ? { create_invoice: true, invoice_amount: amount, is_inclusive_tax: data.is_inclusive_tax } : {}
    const text = { reason: data.reason.trim() || undefined, notes: data.notes.trim() || undefined }
    try {
      if (item.kind === 'package') {
        ensureOk(await usersService.grantPackageAccess(user._id, { package_id: item.value._id, duration_days: data.duration_days, ...(tier ? { tier_index: tier.index } : {}), ...invoice, ...text }))
        toast.success(`Package access granted to ${personName(user)}`)
      } else if (item.kind === 'ebook') {
        ensureOk(await usersService.grantEbookAccess(user._id, { book_id: item.value._id, ...invoice, ...text }))
        toast.success(`Ebook access granted to ${personName(user)}`)
      } else {
        ensureOk(await usersService.grantSessionAccess(user._id, { session_id: item.value._id, ...invoice, ...text }))
        toast.success(`Session access granted to ${personName(user)}`)
      }
      leave(doneHref)
    } catch (err) {
      setSubmitError(errText(err, 'Access was not granted. Please try again.'))
    }
  }

  const options = (items || []).map((i) => ({
    value: i.value._id,
    label: itemTitle(i),
    hint: i.kind === 'package' ? [refName(i.value.subject_id) || 'No subject', i.value.tiers?.length ? plural(i.value.tiers.length, 'length') : formatDuration(i.value.duration_days)].join(' · ')
      : i.kind === 'ebook' ? [i.value.author, formatINR(priceOf(i.value))].filter(Boolean).join(' · ')
        : [dayTimeIST(i.value.scheduled_start_time), i.value.is_free ? 'Free' : formatINR(i.value.price)].join(' · '),
  }))
  const fieldLabel = type === 'package' ? 'Package' : type === 'ebook' ? 'Ebook' : 'Session'

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit, () => focusFirstError(formRef.current))} noValidate className="relative">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Section title={fieldLabel}>
            <div className="space-y-5">
              <Field id="grant-item" label={fieldLabel} required error={errors.item_id?.message}>
                <SearchSelect
                  value={v.item_id} onChange={(id) => setValue('item_id', id, { shouldDirty: true, shouldValidate: true })} options={options} loading={loading}
                  error={listError} onRetry={() => reload()} disabled={isSubmitting}
                  placeholder={type === 'package' ? 'Select package' : type === 'ebook' ? 'Select ebook' : 'Select session'}
                  searchPlaceholder={`Search ${fieldLabel.toLowerCase()}s`}
                  emptyText={type === 'ebook' ? 'No ebooks available' : type === 'session' ? 'No upcoming sessions' : 'No active packages'}
                />
              </Field>
              {known && <Notice tone={known.tone}>{known.text}</Notice>}
              {pkg && tiers.length > 0 && (
                <div>
                  <p id="grant-tier-label" className="mb-1.5 text-[13px] font-medium">Tier<span className="ml-0.5 text-danger" aria-hidden="true">*</span></p>
                  <ChoiceCards
                    label="Tier" value={v.tier_index ?? ''} disabled={isSubmitting}
                    onChange={(index) => setValue('tier_index', index, { shouldDirty: true, shouldValidate: true })}
                    options={tiers.map((t) => ({ value: String(t.index), label: `${formatDuration(t.duration_days)} subscription`, hint: t.name, meta: formatINR(t.price) }))}
                  />
                  {errors.tier_index && <p role="alert" aria-invalid="true" tabIndex={-1} className="mt-1.5 text-xs text-danger">{errors.tier_index.message}</p>}
                </div>
              )}
              {type === 'package' && (
                <Field id="duration_days" label="Duration (days)" required error={errors.duration_days?.message}
                  hint={<>Default: {tier?.duration_days ?? pkg?.duration_days ?? 365} days. Max: 3650 days (10 years).{endsOn ? ` Ends ${dayIST(endsOn)}.` : ''}</>}>
                  <Input type="number" inputMode="numeric" min={1} max={3650} disabled={isSubmitting} className="max-w-[220px] tabular-nums" {...register('duration_days', { valueAsNumber: true })} />
                </Field>
              )}
            </div>
          </Section>

          <Section title="Invoice">
            <div className="flex items-start gap-2.5">
              <Controller name="create_invoice" control={control} render={({ field }) => (
                <Checkbox id="create_invoice" checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} disabled={isSubmitting} className="mt-0.5" />
              )} />
              <Label htmlFor="create_invoice" className="cursor-pointer text-sm font-normal">Create Zoho Invoice (payment collected externally)</Label>
            </div>
            {v.create_invoice && (
              <div className="mt-4 space-y-4">
                <Field id="invoice_amount" label="Amount (INR)" required error={errors.invoice_amount?.message} hint={`Enter the amount collected. Default: ${type} price ${formatINR(defaultPrice)}`}>
                  <Input type="number" inputMode="decimal" min={0} step={0.01} disabled={isSubmitting} className="max-w-[220px] tabular-nums" {...register('invoice_amount', { valueAsNumber: true })} />
                </Field>
                <div className="flex items-start gap-2.5">
                  <Controller name="is_inclusive_tax" control={control} render={({ field }) => (
                    <Checkbox id="is_inclusive_tax" checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} disabled={isSubmitting} className="mt-0.5" />
                  )} />
                  <Label htmlFor="is_inclusive_tax" className="cursor-pointer text-sm font-normal">Amount is inclusive of GST (18%)</Label>
                </div>
                {amount > 0 && (
                  <dl className="max-w-md space-y-1 rounded-lg border border-border bg-muted/40 p-3.5 text-sm tabular-nums">
                    <div className="flex justify-between text-muted-foreground"><dt>Base amount</dt><dd>{formatINR(round(base))}</dd></div>
                    <div className="flex justify-between text-muted-foreground"><dt>GST (18%)</dt><dd>{formatINR(round(total - base))}</dd></div>
                    <div className="flex justify-between border-t border-border pt-1.5 font-semibold"><dt>Invoice Total</dt><dd>{formatINR(round(total))}</dd></div>
                    <p className="pt-1 text-xs text-muted-foreground">Final amount calculated by Zoho based on customer's state (CGST+SGST or IGST).</p>
                  </dl>
                )}
              </div>
            )}
          </Section>

          <Section title="Reason and notes">
            <div className="space-y-5">
              <Field id="reason" label="Reason" error={errors.reason?.message} aside={`${v.reason.length}/500`}>
                <Input placeholder="e.g., Promotional offer, Scholarship, etc." disabled={isSubmitting} {...register('reason')} />
              </Field>
              <Field id="notes" label="Internal Notes" error={errors.notes?.message} aside={`${v.notes.length}/1000`}>
                <Textarea placeholder="Additional notes (internal only)" rows={3} disabled={isSubmitting} {...register('notes')} />
              </Field>
            </div>
          </Section>
        </div>

        <aside aria-label="Access Summary" className="lg:sticky lg:top-0 lg:self-start">
          <Section title="Access Summary">
            <p className="text-sm">
              <Link to={`/users/${user._id}`} className="font-medium text-primary hover:underline hover:underline-offset-4">{personName(user)}</Link>
              {!user.is_active && <span className="text-danger"> (blocked)</span>} will get
            </p>
            {!item ? <p className="mt-2 text-sm text-muted-foreground">Select {type === 'ebook' ? 'an ebook' : `a ${type}`} to see what the student gets.</p> : (
              <div className="mt-3 space-y-3 text-sm">
                <p className="break-words font-semibold">{pkg ? subscriptionLabel(pkg.name, days ? { tier_duration_days: days } : null) : itemTitle(item)}</p>
                {bundled.length > 0 && (
                  <div>
                    <p className="text-[13px] text-muted-foreground">Combo. Also opens:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">{bundled.map((b) => <li key={typeof b === 'object' ? b._id : String(b)} className="break-words">{typeof b === 'object' ? b.name : 'Package'}</li>)}</ul>
                  </div>
                )}
                <dl className="space-y-1.5 border-t border-border pt-3 text-[13px]">
                  <Row label="Access">{pkg ? (endsOn ? `Until ${dayIST(endsOn)}` : 'Set the duration') : item.kind === 'ebook' ? 'No end date' : `Starts ${dayTimeIST((item.value as LiveSession).scheduled_start_time)}`}</Row>
                  <Row label="Cost">{v.create_invoice && amount > 0 ? `Invoice of ${formatINR(round(total))}` : 'No cost'}</Row>
                  {v.create_invoice && amount > 0 && <Row label="Tax">{v.is_inclusive_tax ? 'Tax inclusive' : 'Tax exclusive'}</Row>}
                </dl>
                <p className="text-xs text-muted-foreground">The student gets a push notification.</p>
              </div>
            )}
          </Section>
        </aside>
      </div>
      <EditorBar cancelHref={doneHref} submitLabel="Grant Access" savingLabel="Granting…" saving={isSubmitting} icon={Gift} error={submitError} />
    </form>
  )
}

const round = (n: number) => Math.round(n * 100) / 100

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 text-right font-medium">{children}</dd></div>
}
