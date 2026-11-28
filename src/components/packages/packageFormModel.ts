import { z } from 'zod'
import { endOfIstDay, toIstDateInput } from '@/lib/format'
import { istToday } from '@/components/common/DateRangeFilter'
import type { Package, PackageFormData } from '@/services/packages.service'

/** The package form's fields, rules, and the mapping to and from the API. */

const money = z.number().min(0, 'Use 0 or more').or(z.nan())

const tierSchema = z.object({
  // Saved tiers carry their id so an edit keeps the same tier (coupons and
  // the Zoho item are linked to it). New tiers have none.
  _id: z.string().optional(),
  name: z.string().trim().min(1, 'Name required').max(100, 'Keep it under 100 characters'),
  duration_days: z.number({ error: 'Required' }).int('Whole days').min(1, 'Min 1 day'),
  price: z.number({ error: 'Required' }).min(0, 'Min 0'),
  original_price: money,
  display_order: z.number().int('Whole number').min(0, 'Min 0').or(z.nan()),
})

const plainText = (html: string) => {
  if (!html) return ''
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent || el.innerText || '').trim()
}

export const packageSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(200, 'Keep the name under 200 characters'),
  description: z.string().max(2000, 'Keep it under 2000 characters'),
  subject_id: z.string().min(1, 'Subject is required'),
  package_type_id: z.string().min(1, 'Package type is required'),
  price: z.number({ error: 'Price is required' }).min(0, 'Price must be non-negative'),
  original_price: money,
  is_on_sale: z.boolean(),
  sale_price: money,
  sale_discount_percent: z.number().min(0, 'Use 0 to 100').max(100, 'Use 0 to 100').or(z.nan()),
  sale_end_date: z.string(),
  duration_days: z.number({ error: 'Duration is required' }).int('Use whole days').min(1, 'Minimum 1 day'),
  features: z.string().max(2000, 'Keep it under 2000 characters'),
  rich_description: z.string().max(50000, 'The description is too long'),
  display_order: z.number().int('Use a whole number').min(0, 'Use 0 or more').or(z.nan()),
  is_active: z.boolean(),
  publish_status: z.enum(['draft', 'published']),
  tiers: z.array(tierSchema).max(10, 'Maximum 10 tiers'),
  bundled_package_ids: z.array(z.string()),
}).superRefine((d, ctx) => {
  // A short description is needed unless it can be taken from the rich text
  if (d.description.trim().length < 10 && plainText(d.rich_description).length < 10) {
    ctx.addIssue({ code: 'custom', path: ['description'], message: 'Description must be at least 10 characters' })
  }
  if (d.is_on_sale) {
    if (d.tiers.length > 0) {
      if (!(Number(d.sale_discount_percent) > 0)) ctx.addIssue({ code: 'custom', path: ['sale_discount_percent'], message: 'Sale pricing is required when on sale' })
    } else if (!(Number(d.sale_price) > 0)) {
      ctx.addIssue({ code: 'custom', path: ['sale_price'], message: 'Sale pricing is required when on sale' })
    } else if (Number(d.sale_price) >= d.price) {
      ctx.addIssue({ code: 'custom', path: ['sale_price'], message: 'The sale price must be less than the base price' })
    }
    if (d.sale_end_date && d.sale_end_date < istToday()) ctx.addIssue({ code: 'custom', path: ['sale_end_date'], message: 'Choose today or a later date' })
  }
  const names = new Map<string, number>()
  d.tiers.forEach((t, i) => {
    const key = t.name.trim().toLowerCase()
    if (!key) return
    if (names.has(key)) ctx.addIssue({ code: 'custom', path: ['tiers', i, 'name'], message: 'Another tier has this name' })
    else names.set(key, i)
  })
})

export type PackageFormValues = z.infer<typeof packageSchema>

export const EMPTY_PACKAGE: PackageFormValues = {
  name: '', description: '', subject_id: '', package_type_id: '', price: 0, original_price: Number.NaN, is_on_sale: false,
  sale_price: Number.NaN, sale_discount_percent: Number.NaN, sale_end_date: '', duration_days: 365, features: '', rich_description: '',
  display_order: Number.NaN, is_active: true, publish_status: 'draft', tiers: [], bundled_package_ids: [],
}

const idOf = (ref: unknown): string => (ref && typeof ref === 'object' ? String((ref as { _id?: string })._id ?? '') : ref ? String(ref) : '')
const num = (n: number | null | undefined) => (n === null || n === undefined ? Number.NaN : n)
const finite = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n)

export function toFormValues(pkg: Package): PackageFormValues {
  return {
    name: pkg.name || '',
    description: pkg.description || '',
    subject_id: idOf(pkg.subject_id),
    package_type_id: idOf(pkg.package_type_id),
    price: pkg.price ?? 0,
    original_price: num(pkg.original_price),
    is_on_sale: !!pkg.is_on_sale,
    sale_price: num(pkg.sale_price),
    sale_discount_percent: num(pkg.sale_discount_percent),
    sale_end_date: toIstDateInput(pkg.sale_end_date),
    duration_days: pkg.duration_days || 365,
    features: pkg.features || '',
    rich_description: pkg.rich_description || '',
    display_order: num(pkg.display_order),
    is_active: !!pkg.is_active,
    publish_status: pkg.publish_status || 'draft',
    tiers: (pkg.tiers || []).map((t, i) => ({
      _id: t._id ? String(t._id) : undefined,
      name: t.name || '',
      duration_days: t.duration_days,
      price: t.price,
      original_price: num(t.original_price),
      display_order: t.display_order ?? i,
    })),
    bundled_package_ids: (pkg.bundled_package_ids || []).map(idOf).filter(Boolean),
  }
}

export function toPayload(data: PackageFormValues, mode: 'create' | 'edit', original: Package | null): PackageFormData {
  let description = data.description.trim()
  if (description.length < 10) description = plainText(data.rich_description).slice(0, 2000) || description

  // Older app versions show a plain list: take it from the rich text bullets
  let features = data.features.trim()
  if (data.rich_description && !features) {
    const el = document.createElement('div')
    el.innerHTML = data.rich_description
    features = Array.from(el.querySelectorAll('li')).map((li) => (li.textContent || '').trim()).filter(Boolean).join('\n').slice(0, 2000)
  }

  const payload: PackageFormData = {
    name: data.name.trim(),
    description,
    subject_id: data.subject_id,
    package_type_id: data.package_type_id,
    price: data.price,
    original_price: finite(data.original_price) && data.original_price > 0 ? data.original_price : undefined,
    is_on_sale: data.is_on_sale,
    duration_days: data.duration_days,
    features: features || (mode === 'edit' && original?.features ? '' : undefined),
    // Encoded so the firewall does not reject HTML
    rich_description: data.rich_description ? btoa(unescape(encodeURIComponent(data.rich_description))) : undefined,
    display_order: finite(data.display_order) ? data.display_order : undefined,
    is_active: data.is_active,
    publish_status: data.publish_status,
    tiers: data.tiers.map((t, i) => ({
      ...(t._id ? { _id: t._id } : {}),
      name: t.name.trim(),
      duration_days: t.duration_days,
      price: t.price,
      original_price: finite(t.original_price) && t.original_price > 0 ? t.original_price : null,
      display_order: finite(t.display_order) ? t.display_order : i,
    })),
    bundled_package_ids: data.bundled_package_ids,
  }

  // Multi-tier packages use a discount %, single-price ones an absolute sale price
  if (data.is_on_sale) {
    if (data.tiers.length > 0) payload.sale_discount_percent = Number(data.sale_discount_percent)
    else payload.sale_price = Number(data.sale_price)
    if (data.sale_end_date) {
      // The sale runs to the end of that day in IST. An untouched date keeps its saved moment.
      const unchanged = original?.sale_end_date && toIstDateInput(original.sale_end_date) === data.sale_end_date && new Date(original.sale_end_date).getTime() > Date.now()
      payload.sale_end_date = unchanged ? original!.sale_end_date! : endOfIstDay(data.sale_end_date)
    }
  }
  return payload
}
