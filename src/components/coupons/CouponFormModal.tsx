import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import {
  Coupon, CouponFormData, CouponProductType, CouponApplicableProduct, COUPON_PRODUCT_TYPES,
} from '@/services/coupons.service'
import { CouponProductPicker } from './CouponProductPicker'

const schema = z
  .object({
    code: z.string().min(2, 'Code must be at least 2 characters').max(50, 'Code must be at most 50 characters'),
    description: z.string().max(500, 'Description too long').optional().or(z.literal('')),
    discount_type: z.enum(['percentage', 'flat']),
    discount_value: z.number().min(0, 'Enter a valid discount amount'),
    max_discount_cap: z.number().min(0).optional().or(z.nan()),
    applies_to: z.enum(['all', 'type', 'products']),
    applicable_types: z.array(z.enum(['package', 'session', 'ebook', 'book', 'form'])).optional(),
    min_order_value: z.number().min(0).optional().or(z.nan()),
    max_redemptions: z.number().int().min(0).optional().or(z.nan()),
    per_user_limit: z.number().int().min(0).optional().or(z.nan()),
    expiry_at: z.string().optional().or(z.literal('')),
    is_active: z.boolean(),
    is_visible: z.boolean(),
  })
  .refine((d) => d.discount_type !== 'percentage' || d.discount_value <= 100, {
    message: 'Percentage discount cannot exceed 100',
    path: ['discount_value'],
  })
  .refine((d) => d.applies_to !== 'type' || (d.applicable_types && d.applicable_types.length > 0), {
    message: 'Select at least one product type',
    path: ['applicable_types'],
  })

type CouponFormValues = z.infer<typeof schema>

interface CouponFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CouponFormData) => Promise<void>
  coupon?: Coupon | null
  mode: 'create' | 'edit'
}

const numOrUndef = (n: number | undefined) => (n != null && !isNaN(n) ? n : undefined)

export function CouponFormModal({ open, onClose, onSubmit, coupon, mode }: CouponFormModalProps) {
  const {
    register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch,
  } = useForm<CouponFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '', description: '', discount_type: 'percentage', discount_value: undefined as unknown as number,
      max_discount_cap: undefined, applies_to: 'all', applicable_types: [],
      min_order_value: undefined, max_redemptions: undefined, per_user_limit: undefined,
      expiry_at: '', is_active: true, is_visible: false,
    },
  })

  const discountType = watch('discount_type')
  const appliesTo = watch('applies_to')
  const applicableTypes = watch('applicable_types') || []
  const isActive = watch('is_active')
  const isVisible = watch('is_visible')

  const [applicableProducts, setApplicableProducts] = useState<(CouponApplicableProduct & { label?: string })[]>([])
  const [productError, setProductError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && coupon) {
      reset({
        code: coupon.code,
        description: coupon.description || '',
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_discount_cap: coupon.max_discount_cap ?? undefined,
        applies_to: coupon.applies_to,
        applicable_types: coupon.applicable_types || [],
        min_order_value: coupon.min_order_value || undefined,
        max_redemptions: coupon.max_redemptions ?? undefined,
        per_user_limit: coupon.per_user_limit ?? undefined,
        expiry_at: coupon.expiry_at ? coupon.expiry_at.split('T')[0] : '',
        is_active: coupon.is_active,
        is_visible: coupon.is_visible,
      })
    } else {
      reset({
        code: '', description: '', discount_type: 'percentage', discount_value: undefined as unknown as number,
        max_discount_cap: undefined, applies_to: 'all', applicable_types: [],
        min_order_value: undefined, max_redemptions: undefined, per_user_limit: undefined,
        expiry_at: '', is_active: true, is_visible: false,
      })
    }
    setProductError(null)
    setApplicableProducts(
      mode === 'edit' && coupon && coupon.applies_to === 'products'
        ? (coupon.applicable_products || []).map((p) => ({ product_type: p.product_type, product_id: p.product_id }))
        : [],
    )
  }, [open, mode, coupon, reset])

  const toggleType = (t: CouponProductType) => {
    const set = new Set(applicableTypes)
    set.has(t) ? set.delete(t) : set.add(t)
    setValue('applicable_types', Array.from(set), { shouldValidate: true })
  }

  const handleFormSubmit = async (data: CouponFormValues) => {
    if (data.applies_to === 'products' && applicableProducts.length === 0) {
      setProductError('Select at least one product')
      return
    }
    try {
      const payload: CouponFormData = {
        code: data.code.trim().toUpperCase(),
        description: data.description || undefined,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        max_discount_cap: data.discount_type === 'percentage' ? numOrUndef(data.max_discount_cap) ?? null : null,
        applies_to: data.applies_to,
        applicable_types: data.applies_to === 'type' ? data.applicable_types : [],
        applicable_products: data.applies_to === 'products'
          ? applicableProducts.map((p) => ({ product_type: p.product_type, product_id: p.product_id }))
          : [],
        min_order_value: numOrUndef(data.min_order_value) ?? 0,
        max_redemptions: numOrUndef(data.max_redemptions) ?? null,
        per_user_limit: numOrUndef(data.per_user_limit) ?? null,
        expiry_at: data.expiry_at ? data.expiry_at : null,
        is_active: data.is_active,
        is_visible: data.is_visible,
      }
      await onSubmit(payload)
      onClose()
    } catch (error) {
      console.error('Coupon form submission error:', error)
    }
  }

  const handleClose = () => { if (!isSubmitting) onClose() }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Coupon' : 'Edit Coupon'}</DialogTitle>
          <DialogDescription>
            Coupons are applied at checkout as an invoice discount.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="code">Coupon Code <span className="text-red-500">*</span></Label>
            <Input id="code" placeholder="e.g., WELCOME20" className="uppercase" disabled={isSubmitting || mode === 'edit'} {...register('code')} />
            {mode === 'edit' && <p className="text-xs text-muted-foreground">Code cannot be changed after creation.</p>}
            {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="e.g., 20% off all packages" rows={2} disabled={isSubmitting} {...register('description')} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          {/* Discount type + value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Discount Type <span className="text-red-500">*</span></Label>
              <Select value={discountType} onValueChange={(v) => setValue('discount_type', v as 'percentage' | 'flat')} disabled={isSubmitting}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Flat amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_value">
                {discountType === 'percentage' ? 'Percentage off' : 'Amount off (₹)'} <span className="text-red-500">*</span>
              </Label>
              <Input id="discount_value" type="number" step="0.01" min={0} disabled={isSubmitting} {...register('discount_value', { valueAsNumber: true })} />
              {errors.discount_value && <p className="text-sm text-red-500">{errors.discount_value.message}</p>}
            </div>
          </div>

          {/* Max discount cap (percentage only) */}
          {discountType === 'percentage' && (
            <div className="space-y-2">
              <Label htmlFor="max_discount_cap">Max discount cap (₹)</Label>
              <Input id="max_discount_cap" type="number" step="0.01" min={0} placeholder="Optional — no cap if empty" disabled={isSubmitting} {...register('max_discount_cap', { valueAsNumber: true })} />
              <p className="text-xs text-muted-foreground">Caps the rupee value of a percentage discount (e.g. 20% up to ₹500).</p>
            </div>
          )}

          {/* Applies to */}
          <div className="space-y-2">
            <Label>Applies To</Label>
            <Select value={appliesTo} onValueChange={(v) => setValue('applies_to', v as 'all' | 'type' | 'products', { shouldValidate: true })} disabled={isSubmitting}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                <SelectItem value="type">Specific product types</SelectItem>
                <SelectItem value="products">Specific products</SelectItem>
              </SelectContent>
            </Select>
            {appliesTo === 'type' && (
              <div className="flex flex-wrap gap-2 pt-1">
                {COUPON_PRODUCT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    disabled={isSubmitting}
                    className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                      applicableTypes.includes(t)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            {appliesTo === 'products' && (
              <div className="pt-1">
                <CouponProductPicker
                  value={applicableProducts}
                  onChange={(v) => { setApplicableProducts(v); setProductError(null) }}
                  disabled={isSubmitting}
                />
                {productError && <p className="text-sm text-red-500 mt-1">{productError}</p>}
              </div>
            )}
            {errors.applicable_types && <p className="text-sm text-red-500">{errors.applicable_types.message as string}</p>}
          </div>

          {/* Constraints */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_order_value">Minimum order (₹)</Label>
              <Input id="min_order_value" type="number" step="0.01" min={0} placeholder="0" disabled={isSubmitting} {...register('min_order_value', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_at">Expiry date</Label>
              <Input id="expiry_at" type="date" disabled={isSubmitting} {...register('expiry_at')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_redemptions">Max total redemptions</Label>
              <Input id="max_redemptions" type="number" min={0} placeholder="Unlimited" disabled={isSubmitting} {...register('max_redemptions', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="per_user_limit">Per-user limit</Label>
              <Input id="per_user_limit" type="number" min={0} placeholder="Unlimited" disabled={isSubmitting} {...register('per_user_limit', { valueAsNumber: true })} />
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-base">Active</Label>
              <p className="text-sm text-muted-foreground">{isActive ? 'Coupon can be redeemed' : 'Coupon is disabled'}</p>
            </div>
            <Switch id="is_active" checked={isActive} onCheckedChange={(c) => setValue('is_active', c)} disabled={isSubmitting} />
          </div>

          {/* Visible on checkout */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_visible" className="text-base">Show on Checkout</Label>
              <p className="text-sm text-muted-foreground">
                {isVisible ? 'Listed as a suggestion on the checkout page for eligible products' : 'Hidden — customers must already know the code'}
              </p>
            </div>
            <Switch id="is_visible" checked={isVisible} onCheckedChange={(c) => setValue('is_visible', c)} disabled={isSubmitting} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Create Coupon' : 'Update Coupon'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
