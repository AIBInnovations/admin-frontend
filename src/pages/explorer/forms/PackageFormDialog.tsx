import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { packagesService } from '@/services/packages.service'
import { packageTypesService } from '@/services/packageTypes.service'
import type { Package, PackageDetail } from '@/services/packages.service'
import type { PackageType } from '@/services/packageTypes.service'

interface PackageFormDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  subjectId: string
  pkg?: Package | PackageDetail
}

export function PackageFormDialog({
  open,
  onClose,
  onSuccess,
  subjectId,
  pkg,
}: PackageFormDialogProps) {
  const isEdit = !!pkg

  const [packageTypes, setPackageTypes] = useState<PackageType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(false)

  const [packageTypeId, setPackageTypeId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [durationDays, setDurationDays] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [displayOrder, setDisplayOrder] = useState('')

  // Load package types once
  useEffect(() => {
    if (!open || packageTypes.length > 0) return
    setLoadingTypes(true)
    packageTypesService
      .getAllPublic()
      .then((res) => { if (res.success && res.data) setPackageTypes(res.data) })
      .finally(() => setLoadingTypes(false))
  }, [open, packageTypes.length])

  // Populate form fields
  useEffect(() => {
    if (!open) return
    if (pkg) {
      const typeId =
        typeof pkg.package_type_id === 'object'
          ? (pkg.package_type_id as { _id: string })._id
          : pkg.package_type_id ?? ''
      setPackageTypeId(typeId)
      setName(pkg.name)
      setDescription(pkg.description ?? '')
      setPrice(pkg.price?.toString() ?? '')
      setOriginalPrice(pkg.original_price?.toString() ?? '')
      setDurationDays(pkg.duration_days?.toString() ?? '')
      setIsActive(pkg.is_active)
      setDisplayOrder(pkg.display_order?.toString() ?? '')
    } else {
      setPackageTypeId('')
      setName('')
      setDescription('')
      setPrice('')
      setOriginalPrice('')
      setDurationDays('')
      setIsActive(true)
      setDisplayOrder('')
    }
  }, [open, pkg])

  const mutation = useExplorerMutation({
    name: isEdit ? 'Update package' : 'Create package',
    fn: () => {
      const data = {
        subject_id: subjectId,
        package_type_id: packageTypeId,
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        original_price: originalPrice ? Number(originalPrice) : null,
        duration_days: Number(durationDays),
        is_active: isActive,
        display_order: displayOrder ? Number(displayOrder) : undefined,
      }
      return isEdit
        ? packagesService.update(pkg!._id, data)
        : packagesService.create(data)
    },
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: isEdit ? 'Package updated' : 'Package created',
  })

  const priceNum = price.trim() === '' ? NaN : Number(price)
  const durationNum = durationDays.trim() === '' ? NaN : Number(durationDays)
  const valid =
    !!packageTypeId &&
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    Number.isFinite(priceNum) && priceNum >= 0 &&
    Number.isFinite(durationNum) && durationNum > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Package' : 'New Package'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Package Type */}
          <div className="space-y-1.5">
            <Label htmlFor="p-type">
              Package Type <span className="text-destructive">*</span>
            </Label>
            {loadingTypes ? (
              <div className="flex items-center gap-2 h-9 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading types…
              </div>
            ) : (
              <select
                id="p-type"
                value={packageTypeId}
                onChange={(e) => setPackageTypeId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a type…</option>
                {packageTypes.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="p-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ECG Complete Package"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="p-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's included in this package…"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-price">
                Price (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="p-price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                type="number"
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-orig">Original Price (₹)</Label>
              <Input
                id="p-orig"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="e.g. 4999"
                type="number"
                min={0}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label htmlFor="p-dur">
              Duration (days) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="p-dur"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="e.g. 365"
              type="number"
              min={1}
              className="w-40"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <Label htmlFor="p-active" className="text-sm font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">Visible to eligible students</p>
            </div>
            <Switch id="p-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Display order */}
          <div className="space-y-1.5">
            <Label htmlFor="p-order">Display Order</Label>
            <Input
              id="p-order"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              placeholder="e.g. 1"
              type="number"
              min={0}
              className="w-32"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.loading}>
            Cancel
          </Button>
          <Button onClick={mutation.execute} disabled={!valid || mutation.loading}>
            {mutation.loading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…</>
            ) : isEdit ? 'Save changes' : 'Create package'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
