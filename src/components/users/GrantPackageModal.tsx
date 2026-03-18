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
import { Loader2, Package as PackageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { GrantPackageData } from '@/services/users.service'
import { type Package, packagesService } from '@/services/packages.service'

const grantPackageSchema = z.object({
  package_id: z.string().min(1, 'Package is required'),
  duration_days: z.number().min(1, 'Min 1 day').max(3650, 'Max 3650 days'),
  tier_index: z.number().optional(),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
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
      reason: '',
      notes: '',
    },
  })

  const watchPackageId = watch('package_id')

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
      }
    } else {
      setSelectedPackage(null)
    }
  }, [watchPackageId, packages, setValue])

  // Reset form
  useEffect(() => {
    if (open) {
      reset({
        package_id: '',
        duration_days: 365,
        tier_index: undefined,
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
                <strong>{watch('duration_days')} days</strong> at no cost.
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
