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
import RichTextEditor from '@/components/common/RichTextEditor'
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

const SHORT_DESC_MIN = 10
const SHORT_DESC_MAX = 2000
const RICH_DESC_MAX = 50_000

/**
 * Encode a rich-text HTML payload to base64, matching what the backend
 * ingest expects. Replicates legacy PackageFormModal behaviour so the
 * existing app can continue to render `rich_description` unchanged.
 */
function encodeRichDescription(html: string): string {
  return btoa(unescape(encodeURIComponent(html)))
}

/** Derive plain short-description from HTML — used as fallback when the
 *  admin leaves the short description too short. Matches legacy logic. */
function htmlToPlainText(html: string): string {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  return (tempDiv.textContent || tempDiv.innerText || '').trim()
}

/** Pull bullet-list items out of the HTML, one per line. Legacy auto-fills
 *  the plain-text `features` field from these for older app versions. */
function htmlBulletsToFeatures(html: string): string {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  const lis = tempDiv.querySelectorAll('li')
  if (lis.length === 0) return ''
  return Array.from(lis)
    .map((li) => (li.textContent || '').trim())
    .filter(Boolean)
    .join('\n')
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
  const [richDescription, setRichDescription] = useState('')
  const [features, setFeatures] = useState('')
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
      // Backend stores raw HTML — TipTap takes it as-is.
      setRichDescription(pkg.rich_description ?? '')
      setFeatures(pkg.features ?? '')
      setPrice(pkg.price?.toString() ?? '')
      setOriginalPrice(pkg.original_price?.toString() ?? '')
      setDurationDays(pkg.duration_days?.toString() ?? '')
      setIsActive(pkg.is_active)
      setDisplayOrder(pkg.display_order?.toString() ?? '')
    } else {
      setPackageTypeId('')
      setName('')
      setDescription('')
      setRichDescription('')
      setFeatures('')
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
      // If the admin left the plain short-description too brief but filled
      // rich text, derive the plain version from the rich HTML — matches
      // legacy behaviour so older app versions still get a readable string.
      let finalShortDesc = description.trim()
      if (richDescription && finalShortDesc.length < SHORT_DESC_MIN) {
        const plain = htmlToPlainText(richDescription)
        if (plain.length >= SHORT_DESC_MIN) {
          finalShortDesc = plain.slice(0, SHORT_DESC_MAX)
        }
      }

      // Auto-fill features from bullet items if admin didn't provide any.
      let finalFeatures = features.trim()
      if (richDescription && !finalFeatures) {
        finalFeatures = htmlBulletsToFeatures(richDescription)
      }

      const data = {
        subject_id: subjectId,
        package_type_id: packageTypeId,
        name: name.trim(),
        description: finalShortDesc,
        price: Number(price),
        original_price: originalPrice ? Number(originalPrice) : null,
        duration_days: Number(durationDays),
        features: finalFeatures || undefined,
        rich_description: richDescription ? encodeRichDescription(richDescription) : undefined,
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
  // Short description is satisfied by either an explicit ≥10-char entry,
  // or a rich description from which a ≥10-char plain version can be derived.
  const richPlainLength = richDescription ? htmlToPlainText(richDescription).length : 0
  const shortDescOk =
    description.trim().length >= SHORT_DESC_MIN ||
    richPlainLength >= SHORT_DESC_MIN
  const valid =
    !!packageTypeId &&
    name.trim().length >= 2 &&
    shortDescOk &&
    description.trim().length <= SHORT_DESC_MAX &&
    richDescription.length <= RICH_DESC_MAX &&
    Number.isFinite(priceNum) && priceNum >= 0 &&
    Number.isFinite(durationNum) && durationNum > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-160 max-h-[90vh] overflow-y-auto">
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

          {/* Short description (legacy plain-text — backward compat) */}
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">
              Short description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="p-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One or two sentences. Used as a fallback for older app versions."
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Min {SHORT_DESC_MIN} chars. Auto-filled from the rich description below if left short.
            </p>
          </div>

          {/* Rich description — TipTap */}
          <div className="space-y-1.5">
            <Label>Package description</Label>
            <RichTextEditor
              value={richDescription}
              onChange={setRichDescription}
              placeholder="What's included in this package…"
              disabled={mutation.loading}
            />
            <p className="text-xs text-muted-foreground">
              Formatting, headings, and bullet lists are preserved on device.
            </p>
          </div>

          {/* Features (legacy plain-text, one per line) */}
          <div className="space-y-1.5">
            <Label htmlFor="p-features">Features (for older app versions)</Label>
            <Textarea
              id="p-features"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="One feature per line."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Auto-filled from bullet-list items in the rich description if left empty.
            </p>
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
