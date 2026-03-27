import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Package as PackageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { GrantPackageData } from '@/services/users.service'
import { type Package, packagesService } from '@/services/packages.service'

const GST_RATE = 0.18

const grantPackageSchema = z.object({
  package_id: z.string().min(1, 'Package is required'),
  duration_days: z.number().min(1, 'Min 1 day').max(3650, 'Max 3650 days'),
  tier_index: z.number().optional(),
  create_invoice: z.boolean().optional(),
  invoice_amount: z.number().min(0).optional(),
  is_inclusive_tax: z.boolean().optional(),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
}).refine((data) => !data.create_invoice || (data.invoice_amount && data.invoice_amount > 0), {
  message: 'Invoice amount must be greater than 0 when creating an invoice',
  path: ['invoice_amount'],
})

type GrantPackageFormValues = z.infer<typeof grantPackageSchema>

interface GrantPackageModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: GrantPackageData) => Promise<void>
  userName: string
}

export function GrantPackageModal({ open, onClose, onSubmit, userName }: GrantPackageModalProps) {
  const [packages, setPackages] = useState<Package[]>([])
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [loadingPackages, setLoadingPackages] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GrantPackageFormValues>({
    resolver: zodResolver(grantPackageSchema),
    defaultValues: {
      package_id: '',
      duration_days: 365,
      tier_index: undefined,
      create_invoice: false,
      invoice_amount: 0,
      is_inclusive_tax: false,
      reason: '',
      notes: '',
    },
  })

  const watchPackageId = watch('package_id')
  const watchCreateInvoice = watch('create_invoice')
  const watchInvoiceAmount = watch('invoice_amount')
  const watchInclusiveTax = watch('is_inclusive_tax')
  const watchTierIndex = watch('tier_index')

  // Fetch packages
  useEffect(() => {
    if (open) {
      setLoadingPackages(true)
      packagesService
        .getAll({ is_active: true, limit: 100 })
        .then((res) => {
          if (res.success && res.data) {
            setPackages(res.data.entities || [])
          }
        })
        .catch(() => toast.error('Failed to load packages'))
        .finally(() => setLoadingPackages(false))
    }
  }, [open])

  // Update selected package when package_id changes
  useEffect(() => {
    if (watchPackageId) {
      const pkg = packages.find((p) => p._id === watchPackageId)
      setSelectedPackage(pkg || null)

      // Auto-set duration from package default
      if (pkg) {
        setValue('duration_days', pkg.duration_days)
        // Auto-populate invoice amount with package price
        const effectivePrice = pkg.is_on_sale && pkg.sale_price ? pkg.sale_price : (pkg.price ?? 0)
        setValue('invoice_amount', effectivePrice)
      }
    } else {
      setSelectedPackage(null)
    }
  }, [watchPackageId, packages, setValue])

  // Update invoice amount when tier changes
  useEffect(() => {
    if (selectedPackage?.tiers && selectedPackage.tiers.length > 0 && watchTierIndex !== undefined) {
      const tier = selectedPackage.tiers[watchTierIndex]
      if (tier) {
        setValue('duration_days', tier.duration_days)
        setValue('invoice_amount', tier.price ?? 0)
      }
    }
  }, [watchTierIndex, selectedPackage, setValue])

  // Reset form
  useEffect(() => {
    if (open) {
      reset({
        package_id: '',
        duration_days: 365,
        tier_index: undefined,
        create_invoice: false,
        invoice_amount: 0,
        is_inclusive_tax: false,
        reason: '',
        notes: '',
      })
      setSelectedPackage(null)
    }
  }, [open, reset])

  const handleFormSubmit = async (data: GrantPackageFormValues) => {
    await onSubmit(data as GrantPackageData)
    onClose()
  }

  const hasTiers = selectedPackage?.tiers && selectedPackage.tiers.length > 0

  // Get current effective price for display
  const getDefaultPrice = () => {
    if (hasTiers && watchTierIndex !== undefined) {
      const tier = selectedPackage.tiers[watchTierIndex]
      return tier?.price ?? 0
    }
    if (selectedPackage) {
      return selectedPackage.is_on_sale && selectedPackage.sale_price
        ? selectedPackage.sale_price
        : (selectedPackage.price ?? 0)
    }
    return 0
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Grant Package Access</DialogTitle>
          <DialogDescription>
            Grant complimentary package access to <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Package Selection */}
          <div className="space-y-2">
            <Label>
              Package <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="package_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting || loadingPackages}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingPackages ? 'Loading...' : 'Select package'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg._id} value={pkg._id}>
                        {pkg.name} (
                        {pkg.subject_id && typeof pkg.subject_id === 'object'
                          ? pkg.subject_id.name
                          : 'N/A'}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.package_id && (
              <p className="text-sm text-red-500">{errors.package_id.message}</p>
            )}
          </div>

          {/* Tier Selection (if multi-tier) */}
          {hasTiers && (
            <div className="space-y-2">
              <Label>
                Tier <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="tier_index"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value !== undefined ? String(field.value) : ''}
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPackage.tiers.map((tier, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          {tier.name} - {tier.duration_days} days (INR {tier.price})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tier_index && (
                <p className="text-sm text-red-500">{errors.tier_index.message}</p>
              )}
            </div>
          )}

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration_days">
              Duration (days) <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="duration_days"
              control={control}
              render={({ field }) => (
                <Input
                  id="duration_days"
                  type="number"
                  min={1}
                  max={3650}
                  disabled={isSubmitting}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              )}
            />
            {errors.duration_days && (
              <p className="text-sm text-red-500">{errors.duration_days.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Default: {selectedPackage?.duration_days || 365} days. Max: 3650 days (10 years)
            </p>
          </div>

          {/* Invoice Toggle */}
          <div className="flex items-center space-x-2">
            <Controller
              name="create_invoice"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="create_invoice"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
            <Label htmlFor="create_invoice" className="text-sm font-normal cursor-pointer">
              Create Zoho Invoice (payment collected externally)
            </Label>
          </div>

          {/* Invoice Amount + Tax Mode (shown only when invoice toggle is ON) */}
          {watchCreateInvoice && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="invoice_amount">
                  Amount (INR) <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="invoice_amount"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="invoice_amount"
                      type="number"
                      min={0}
                      step={0.01}
                      disabled={isSubmitting}
                      {...field}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        field.onChange(Number.isNaN(v) ? 0 : v)
                      }}
                    />
                  )}
                />
                {errors.invoice_amount && (
                  <p className="text-sm text-red-500">{errors.invoice_amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter the amount collected. Default: package price ₹{getDefaultPrice()}
                </p>
              </div>

              {/* Tax Mode */}
              <div className="flex items-center space-x-2">
                <Controller
                  name="is_inclusive_tax"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="is_inclusive_tax"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  )}
                />
                <Label htmlFor="is_inclusive_tax" className="text-sm font-normal cursor-pointer">
                  Amount is inclusive of GST (18%)
                </Label>
              </div>

              {/* Price Breakdown Preview */}
              {watchInvoiceAmount && watchInvoiceAmount > 0 && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                  {watchInclusiveTax ? (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Base amount</span>
                        <span>₹{(watchInvoiceAmount / (1 + GST_RATE)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST (18%)</span>
                        <span>₹{(watchInvoiceAmount - watchInvoiceAmount / (1 + GST_RATE)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Invoice Total</span>
                        <span>₹{watchInvoiceAmount.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Base amount</span>
                        <span>₹{watchInvoiceAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST (18%)</span>
                        <span>₹{(watchInvoiceAmount * GST_RATE).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Invoice Total</span>
                        <span>₹{(watchInvoiceAmount * (1 + GST_RATE)).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground pt-1">
                    Final amount calculated by Zoho based on customer's state (CGST+SGST or IGST).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              placeholder="e.g., Promotional offer, Scholarship, etc."
              disabled={isSubmitting}
              {...register('reason')}
            />
            {errors.reason && <p className="text-sm text-red-500">{errors.reason.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes (internal only)"
              rows={3}
              disabled={isSubmitting}
              {...register('notes')}
            />
            {errors.notes && <p className="text-sm text-red-500">{errors.notes.message}</p>}
          </div>

          {/* Summary */}
          {selectedPackage && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <PackageIcon className="h-4 w-4" />
                Access Summary
              </div>
              <p className="text-muted-foreground">
                User will get <strong>{selectedPackage.name}</strong> for{' '}
                <strong>{watch('duration_days')} days</strong>
                {watchCreateInvoice && watchInvoiceAmount && watchInvoiceAmount > 0
                  ? <> for <strong>₹{watchInvoiceAmount}</strong> (invoice will be created).</>
                  : <> at no cost.</>
                }
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedPackage}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Granting...
                </>
              ) : (
                'Grant Access'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
