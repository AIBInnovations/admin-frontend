import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Percent, IndianRupee, Globe2, Shapes, ListChecks, Users, UserCheck, BookMarked } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { endOfIstDay, toIstDateInput } from '@/lib/format'
import {
  couponsService, Coupon, CouponFormData, CouponProductType, COUPON_PRODUCT_TYPES,
} from '@/services/coupons.service'
import { CouponProductPicker, CouponTarget, resolveTarget, TYPE_LABELS } from '@/components/coupons/CouponProductPicker'
import { CouponCustomerPicker, PickerUser } from '@/components/coupons/CouponCustomerPicker'
import { CouponSubjectPicker, SubjectOption } from '@/components/coupons/CouponSubjectPicker'
import { CouponTicket, couponState } from '@/components/coupons/CouponTicket'

// New codes are kept to characters students can type reliably. Existing
// codes are never re-validated (the backend accepts any 2-50 characters and
// the code cannot change after creation).
const codeRule = z.string().trim().min(2, 'Use at least 2 characters').max(50, 'Use 50 characters or fewer')
const newCodeRule = codeRule.regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, - or _ only (no spaces)')

const makeSchema = (mode: 'create' | 'edit') => z
  .object({
    code: mode === 'create' ? newCodeRule : codeRule,
    description: z.string().max(500, 'Keep the description under 500 characters').optional().or(z.literal('')),
    discount_type: z.enum(['percentage', 'flat']),
    discount_value: z.number({ message: 'Enter the discount' }).positive('Enter a discount above 0'),
    max_discount_cap: z.number().min(0).optional().or(z.nan()),
    applies_to: z.enum(['all', 'type', 'products', 'subject']),
    applicable_types: z.array(z.enum(['package', 'session', 'workshop', 'ebook', 'book', 'form'])).optional(),
    min_order_value: z.number().min(0).optional().or(z.nan()),
    max_redemptions: z.number().int().min(0).optional().or(z.nan()),
    per_user_limit: z.number().int().min(0).optional().or(z.nan()),
    expiry_at: z.string().optional().or(z.literal('')),
    is_active: z.boolean(),
    is_visible: z.boolean(),
    customer_scope: z.enum(['all', 'specific']),
  })
  .refine((d) => d.discount_type !== 'percentage' || d.discount_value <= 100, {
    message: 'A percentage discount cannot be more than 100',
    path: ['discount_value'],
  })
  .refine((d) => d.applies_to !== 'type' || (d.applicable_types && d.applicable_types.length > 0), {
    message: 'Choose at least one product type',
    path: ['applicable_types'],
  })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

const EMPTY: FormValues = {
  code: '', description: '', discount_type: 'percentage', discount_value: undefined as unknown as number,
  max_discount_cap: undefined, applies_to: 'products', applicable_types: [],
  min_order_value: undefined, max_redemptions: undefined, per_user_limit: undefined,
  expiry_at: '', is_active: true, is_visible: false, customer_scope: 'all',
}

const numOrUndef = (n: number | undefined) => (n != null && !isNaN(n) ? n : undefined)

function toTargets(c: Coupon): CouponTarget[] {
  if (c.applies_to !== 'products') return []
  return (c.applicable_products || []).map((p) => ({
    product_type: p.product_type,
    product_id: String(p.product_id),
    tier_ids: (p.tier_ids || []).map(String),
    label: p.product_name ?? null,
    tiers: p.tiers,
  }))
}

export function CouponEditorPage() {
  const { couponId } = useParams<{ couponId: string }>()
  const mode: 'create' | 'edit' = couponId ? 'edit' : 'create'
  const navigate = useNavigate()

  const [loadingCoupon, setLoadingCoupon] = useState(mode === 'edit')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [original, setOriginal] = useState<Coupon | null>(null)
  const [targets, setTargets] = useState<CouponTarget[]>([])
  const [targetsTouched, setTargetsTouched] = useState(false)
  const [productError, setProductError] = useState<string | null>(null)
  const [users, setUsers] = useState<PickerUser[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [subjectError, setSubjectError] = useState<string | null>(null)
  const [customerError, setCustomerError] = useState<string | null>(null)

  const {
    register, handleSubmit, formState: { errors, isSubmitting, isDirty }, reset, setValue, watch, setFocus,
  } = useForm<FormValues>({ resolver: zodResolver(makeSchema(mode)), defaultValues: EMPTY })

  // Load the coupon being edited, then fill in any product names / tiers the
  // API did not send.
  useEffect(() => {
    if (mode !== 'edit' || !couponId) return
    let cancelled = false
    ;(async () => {
      setLoadingCoupon(true)
      try {
        const res = await couponsService.getById(couponId)
        if (cancelled) return
        if (!res.success || !res.data) {
          setLoadError(res.message || 'This coupon could not be loaded.')
          return
        }
        const c = res.data
        setOriginal(c)
        reset({
          code: c.code,
          description: c.description || '',
          discount_type: c.discount_type,
          discount_value: c.discount_value,
          max_discount_cap: c.max_discount_cap ?? undefined,
          applies_to: c.applies_to,
          applicable_types: c.applicable_types || [],
          min_order_value: c.min_order_value || undefined,
          max_redemptions: c.max_redemptions ?? undefined,
          per_user_limit: c.per_user_limit ?? undefined,
          expiry_at: toIstDateInput(c.expiry_at),
          is_active: c.is_active,
          is_visible: c.is_visible,
          customer_scope: c.customer_scope || 'all',
        })
        setSubjects(
          c.applies_to === 'subject'
            ? (c.applicable_subject_ids || []).map((id) => ({
                _id: String(id),
                name: c.applicable_subjects?.find((x) => String(x._id) === String(id))?.name ?? null,
              }))
            : [],
        )
        const initial = toTargets(c)
        setTargets(initial)
        setUsers(
          c.customer_scope === 'specific'
            ? (c.applicable_users || []).map((u) => ({ id: u._id, label: u.name || u.email, sublabel: u.email || u.phone_number }))
            : [],
        )
        const resolved = await Promise.all(initial.map(resolveTarget))
        if (!cancelled) setTargets(resolved)
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || 'This coupon could not be loaded.')
      } finally {
        if (!cancelled) setLoadingCoupon(false)
      }
    })()
    return () => { cancelled = true }
  }, [mode, couponId, reset])

  const dirty = isDirty || targetsTouched
  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty || isSubmitting) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty, isSubmitting])

  const v = watch()
  const previewCoupon = useMemo(() => ({
    code: (v.code || '').trim().toUpperCase(),
    discount_type: v.discount_type,
    discount_value: v.discount_value,
    max_discount_cap: v.discount_type === 'percentage' ? numOrUndef(v.max_discount_cap) ?? null : null,
    applies_to: v.applies_to,
    applicable_types: v.applicable_types || [],
    applicable_products: targets,
    applicable_subjects: subjects,
    min_order_value: numOrUndef(v.min_order_value) ?? 0,
    max_redemptions: numOrUndef(v.max_redemptions) ?? null,
    per_user_limit: numOrUndef(v.per_user_limit) ?? null,
    expiry_at: v.expiry_at ? endOfIstDay(v.expiry_at) : null,
    customer_scope: v.customer_scope,
    applicable_users: users,
    is_active: v.is_active,
    redemption_count: original?.redemption_count || 0,
  }), [v, targets, subjects, users, original])

  const updateTargets = (t: CouponTarget[]) => { setTargets(t); setTargetsTouched(true); setProductError(null) }

  const toggleType = (t: CouponProductType) => {
    const set = new Set(v.applicable_types || [])
    if (set.has(t)) set.delete(t)
    else set.add(t)
    setValue('applicable_types', Array.from(set), { shouldValidate: true, shouldDirty: true })
  }

  const onInvalid = (errs: Record<string, unknown>) => {
    const first = Object.keys(errs)[0] as keyof FormValues | undefined
    if (first) setFocus(first)
  }

  const onSubmit = async (data: FormValues) => {
    if (data.applies_to === 'products' && targets.length === 0) {
      setProductError('Add at least one product')
      document.getElementById('coupon-section-scope')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (data.applies_to === 'products' && targets.some((t) => t.missing)) {
      setProductError('Remove the products that no longer exist before saving')
      return
    }
    if (data.applies_to === 'subject' && subjects.length === 0) {
      setSubjectError('Choose at least one subject')
      document.getElementById('coupon-section-scope')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (data.customer_scope === 'specific' && users.length === 0) {
      setCustomerError('Add at least one student')
      return
    }
    const code = data.code.trim().toUpperCase()
    const payload: CouponFormData = {
      code,
      description: data.description || undefined,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      max_discount_cap: data.discount_type === 'percentage' ? numOrUndef(data.max_discount_cap) ?? null : null,
      applies_to: data.applies_to,
      applicable_types: data.applies_to === 'type' ? data.applicable_types : [],
      applicable_products: data.applies_to === 'products'
        ? targets.map((t) => (t.product_type === 'package'
          ? { product_type: t.product_type, product_id: t.product_id, tier_ids: t.tier_ids }
          : { product_type: t.product_type, product_id: t.product_id }))
        : [],
      applicable_subject_ids: data.applies_to === 'subject' ? subjects.map((x) => x._id) : [],
      min_order_value: numOrUndef(data.min_order_value) ?? 0,
      max_redemptions: numOrUndef(data.max_redemptions) ?? null,
      per_user_limit: numOrUndef(data.per_user_limit) ?? null,
      expiry_at: data.expiry_at ? endOfIstDay(data.expiry_at) : null,
      is_active: data.is_active,
      is_visible: data.is_visible,
      customer_scope: data.customer_scope,
      applicable_users: data.customer_scope === 'specific' ? users.map((u) => u.id) : [],
    }
    try {
      const res = mode === 'create'
        ? await couponsService.create(payload)
        : await couponsService.update(couponId!, (({ code: _code, ...rest }) => rest)(payload) as CouponFormData)
      if (!res.success || !res.data) {
        toast.error(res.message || (mode === 'create' ? 'Could not create the coupon' : 'Could not save the coupon'))
        return
      }
      // Guard against a server that silently drops the length restriction
      // (a backend older than tier targeting). The admin must know the coupon
      // is broader than they asked for.
      const sentTierLimit = (payload.applicable_products || []).some((p) => (p.tier_ids || []).length > 0)
      const savedTierLimit = (res.data.applicable_products || []).some((p) => (p.tier_ids || []).length > 0)
      if (sentTierLimit && !savedTierLimit) {
        toast.warning('Saved, but the server ignored the subscription-length limit. This coupon currently applies to every length. Deploy the backend update before relying on it.', { duration: 12000 })
      } else {
        toast.success(mode === 'create' ? `Coupon ${code} created` : `Coupon ${code} saved`)
      }
      setTargetsTouched(false)
      reset(data)
      navigate(`/commerce/coupons/${res.data._id}`)
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the coupon. Check your connection and try again.')
    }
  }

  const title = mode === 'create' ? 'New coupon' : original ? `Edit ${original.code}` : 'Edit coupon'
  const backHref = mode === 'edit' && couponId ? `/commerce/coupons/${couponId}` : '/commerce/coupons'

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Coupon not available" breadcrumbs={[{ label: 'Commerce' }, { label: 'Coupons', href: '/commerce/coupons' }, { label: 'Edit' }]} />
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/commerce/coupons">Back to coupons</Link></Button>
        </div>
      </div>
    )
  }

  const busy = isSubmitting || loadingCoupon
  const saveLabel = mode === 'create' ? 'Create coupon' : 'Save changes'

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-6 pb-24 lg:pb-6">
      <PageHeader
        title={title}
        description={mode === 'create' ? 'Set the discount, choose exactly which packages and lengths it covers, then check the preview.' : 'Changes apply to the next checkout. Past orders keep the discount they got.'}
        breadcrumbs={[{ label: 'Commerce' }, { label: 'Coupons', href: '/commerce/coupons' }, ...(original ? [{ label: original.code, href: `/commerce/coupons/${original._id}` }] : []), { label: mode === 'create' ? 'New' : 'Edit' }]}
        action={
          <div className="hidden items-center gap-2 lg:flex">
            <Button type="button" variant="ghost" onClick={() => navigate(backHref)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Saving…</> : saveLabel}
            </Button>
          </div>
        }
      />

      {loadingCoupon ? (
        <div className="flex items-center gap-2 rounded-xl border bg-card p-8 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading coupon…
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* ── Form ─────────────────────────────────────────────── */}
          <div className="min-w-0 space-y-5">
            <Section title="Code" hint="What students type at checkout.">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <Field label="Coupon code" htmlFor="code" required error={errors.code?.message}
                  hint={mode === 'edit' ? 'The code cannot change after it is created.' : 'Letters and numbers, no spaces.'}>
                  <Input id="code" placeholder="DIWALI20" className="font-mono uppercase tracking-[0.06em]" autoComplete="off" spellCheck={false}
                    disabled={busy} readOnly={mode === 'edit'} aria-readonly={mode === 'edit'} aria-invalid={!!errors.code} {...register('code')} />
                </Field>
                <Field label="Internal note" htmlFor="description" error={errors.description?.message} hint="Only admins see this.">
                  <Textarea id="description" placeholder="Diwali offer for TECOM Theory, 12 months" rows={2} disabled={busy} {...register('description')} />
                </Field>
              </div>
            </Section>

            <Section title="Discount">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Type" className="sm:col-span-3">
                  <Segmented
                    value={v.discount_type}
                    onChange={(x) => setValue('discount_type', x as FormValues['discount_type'], { shouldDirty: true, shouldValidate: true })}
                    disabled={busy}
                    options={[
                      { value: 'percentage', label: 'Percentage', icon: Percent },
                      { value: 'flat', label: 'Fixed amount', icon: IndianRupee },
                    ]}
                    ariaLabel="Discount type"
                  />
                </Field>
                <Field label={v.discount_type === 'percentage' ? 'Percent off' : 'Amount off (₹)'} htmlFor="discount_value" required error={errors.discount_value?.message}>
                  <Input id="discount_value" type="number" inputMode="decimal" step="0.01" min={0} className="font-mono" autoComplete="off"
                    disabled={busy} aria-invalid={!!errors.discount_value} {...register('discount_value', { valueAsNumber: true })} />
                </Field>
                {v.discount_type === 'percentage' && (
                  <Field label="Most it can take off (₹)" htmlFor="max_discount_cap" hint="Leave empty for no cap." className="sm:col-span-2">
                    <Input id="max_discount_cap" type="number" inputMode="decimal" step="0.01" min={0} placeholder="No cap" className="font-mono" autoComplete="off"
                      disabled={busy} {...register('max_discount_cap', { valueAsNumber: true })} />
                  </Field>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">If a sale price is already lower, the student pays the sale price. The coupon never adds to a sale.</p>
            </Section>

            <Section id="coupon-section-scope" title="What it applies to" hint="Coupons follow the subscription the student buys. Pick the package and the lengths it covers.">
              <Segmented
                value={v.applies_to}
                onChange={(x) => { setValue('applies_to', x as FormValues['applies_to'], { shouldDirty: true, shouldValidate: true }); setProductError(null); setSubjectError(null) }}
                disabled={busy}
                options={[
                  { value: 'products', label: 'Chosen products', icon: ListChecks },
                  { value: 'subject', label: 'Whole subjects', icon: BookMarked },
                  { value: 'type', label: 'Whole categories', icon: Shapes },
                  { value: 'all', label: 'Everything', icon: Globe2 },
                ]}
                ariaLabel="What the coupon applies to"
              />
              <div className="mt-4">
                {v.applies_to === 'products' && (
                  <>
                    <CouponProductPicker value={targets} onChange={updateTargets} disabled={busy} />
                    {productError && <p role="alert" className="mt-2 text-sm text-danger">{productError}</p>}
                  </>
                )}
                {v.applies_to === 'subject' && (
                  <>
                    <CouponSubjectPicker
                      value={subjects}
                      onChange={(x) => { setSubjects(x); setTargetsTouched(true); setSubjectError(null) }}
                      disabled={busy}
                    />
                    {subjectError && <p role="alert" className="mt-2 text-sm text-danger">{subjectError}</p>}
                  </>
                )}
                {v.applies_to === 'type' && (
                  <fieldset>
                    <legend className="mb-2 text-xs text-muted-foreground">Every product in the chosen categories, every length.</legend>
                    <div className="flex flex-wrap gap-2">
                      {COUPON_PRODUCT_TYPES.map((t) => {
                        const on = (v.applicable_types || []).includes(t)
                        return (
                          <button key={t} type="button" role="checkbox" aria-checked={on} onClick={() => toggleType(t)} disabled={busy}
                            className={cn('rounded-full border px-3 py-1.5 text-sm transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-foreground hover:border-primary/40')}>
                            {TYPE_LABELS[t]}
                          </button>
                        )
                      })}
                    </div>
                    {errors.applicable_types && <p role="alert" className="mt-2 text-sm text-danger">{errors.applicable_types.message as string}</p>}
                  </fieldset>
                )}
                {v.applies_to === 'all' && (
                  <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">This coupon will work on every package, length, book, session, workshop and form.</p>
                )}
              </div>
            </Section>

            <Section title="Who can use it">
              <Segmented
                value={v.customer_scope}
                onChange={(x) => { setValue('customer_scope', x as FormValues['customer_scope'], { shouldDirty: true }); setCustomerError(null) }}
                disabled={busy}
                options={[
                  { value: 'all', label: 'Any student', icon: Users },
                  { value: 'specific', label: 'Chosen students', icon: UserCheck },
                ]}
                ariaLabel="Who can use the coupon"
              />
              {v.customer_scope === 'specific' && (
                <div className="mt-4">
                  <CouponCustomerPicker value={users} onChange={(u) => { setUsers(u); setTargetsTouched(true); setCustomerError(null) }} disabled={busy} />
                  {customerError && <p role="alert" className="mt-2 text-sm text-danger">{customerError}</p>}
                </div>
              )}
            </Section>

            <Section title="Limits and dates">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Last day it works" htmlFor="expiry_at" hint="Works until 11:59 PM IST on this day. Leave empty for no end date.">
                  <Input id="expiry_at" type="date" disabled={busy} {...register('expiry_at')} />
                </Field>
                <Field label="Minimum order (₹)" htmlFor="min_order_value" hint="Before GST and discounts.">
                  <Input id="min_order_value" type="number" inputMode="decimal" step="0.01" min={0} placeholder="0" className="font-mono" autoComplete="off" disabled={busy} {...register('min_order_value', { valueAsNumber: true })} />
                </Field>
                <Field label="Total uses" htmlFor="max_redemptions" hint="Across all students. Empty means unlimited.">
                  <Input id="max_redemptions" type="number" inputMode="numeric" min={0} placeholder="Unlimited" className="font-mono" autoComplete="off" disabled={busy} {...register('max_redemptions', { valueAsNumber: true })} />
                </Field>
                <Field label="Uses per student" htmlFor="per_user_limit" hint="Empty means unlimited.">
                  <Input id="per_user_limit" type="number" inputMode="numeric" min={0} placeholder="Unlimited" className="font-mono" autoComplete="off" disabled={busy} {...register('per_user_limit', { valueAsNumber: true })} />
                </Field>
              </div>
            </Section>

            <Section title="Status">
              <div className="divide-y divide-border rounded-lg border">
                <ToggleRow id="is_active" label="Active" checked={v.is_active} disabled={busy}
                  onChange={(c) => setValue('is_active', c, { shouldDirty: true })}
                  description={v.is_active ? 'Students can redeem it now.' : 'Paused. The code is rejected at checkout.'} />
                <ToggleRow id="is_visible" label="Suggest at checkout" checked={v.is_visible} disabled={busy}
                  onChange={(c) => setValue('is_visible', c, { shouldDirty: true })}
                  description={v.is_visible ? 'Shown as a one-tap suggestion to students it applies to.' : 'Hidden. Students need to know the code.'} />
              </div>
            </Section>
          </div>

          {/* ── Live preview ─────────────────────────────────────── */}
          <aside className="xl:sticky xl:top-0 xl:self-start" aria-label="Preview">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Preview</p>
            <CouponTicket coupon={previewCoupon} state={mode === 'create' ? 'draft' : couponState(previewCoupon)} expanded />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              This is the rule checkout will apply. Read the “Applies to” line once before saving: it is exactly which packages and lengths get the discount.
            </p>
          </aside>
        </div>
      )}

      {/* Mobile and tablet: sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-end gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur lg:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <Button type="button" variant="ghost" asChild disabled={isSubmitting}><Link to={backHref}><ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />Cancel</Link></Button>
        <Button type="submit" disabled={busy}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Saving…</> : saveLabel}
        </Button>
      </div>
    </form>
  )
}

// ── Small building blocks (kept local until a second page needs them) ──

function Section({ id, title, hint, children }: { id?: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 rounded-xl border bg-card p-5 shadow-card sm:p-6">
      <header className="mb-4">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      </header>
      {children}
    </section>
  )
}

function Field({ label, htmlFor, required, error, hint, className, children }: {
  label: string; htmlFor?: string; required?: boolean; error?: string; hint?: string; className?: string; children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}{required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </Label>
      {children}
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function Segmented({ value, onChange, options, disabled, ariaLabel }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; icon?: React.ComponentType<{ className?: string }> }[]
  disabled?: boolean
  ariaLabel: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => {
        const on = o.value === value
        const Icon = o.icon
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => onChange(o.value)}
            className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150',
              on ? 'bg-card text-foreground shadow-card ring-1 ring-border' : 'text-muted-foreground hover:text-foreground')}>
            {Icon && <Icon className={cn('h-3.5 w-3.5', on ? 'text-primary' : '')} />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function ToggleRow({ id, label, description, checked, onChange, disabled }: {
  id: string; label: string; description: string; checked: boolean; onChange: (c: boolean) => void; disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}
