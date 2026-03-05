import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FileUpload } from '@/components/common/FileUpload'
import { ImageCropper } from '@/components/common/ImageCropper'
import { Loader2, X } from 'lucide-react'
import { Banner, BannerFormData, BannerType, bannersService } from '@/services/banners.service'
import { Package, packagesService } from '@/services/packages.service'
import { PackageType, packageTypesService } from '@/services/packageTypes.service'
import { Book, booksService } from '@/services/books.service'
import { toast } from 'sonner'

/** Banner aspect ratio: full-width x 140px on phone (~360px wide) ≈ 18:7 */
const BANNER_ASPECT_RATIO = 18 / 7

type LinkAction = 'none' | 'external_url' | 'theory_package' | 'practical_package' | 'ebook'

const bannerSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200),
  subtitle: z.string().max(300).optional().or(z.literal('')),
  click_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  display_order: z.number().int().min(0).optional().or(z.nan()),
  is_active: z.boolean(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().or(z.literal('')),
})

type BannerFormValues = z.infer<typeof bannerSchema>

interface BannerFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: BannerFormData) => Promise<void>
  banner?: Banner | null
  mode: 'create' | 'edit'
}

/** Derive the link action from a banner's stored fields */
function deriveLinkAction(banner: Banner): LinkAction {
  if (banner.banner_type === 'theory_package') return 'theory_package'
  if (banner.banner_type === 'practical_package') return 'practical_package'
  if (banner.banner_type === 'ebook') return 'ebook'
  if (banner.click_url && banner.link_type === 'external') return 'external_url'
  return 'none'
}

export function BannerFormModal({ open, onClose, onSubmit, banner, mode }: BannerFormModalProps) {
  const [imageFile, setImageFile] = useState<File[]>([])
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [existingS3Key, setExistingS3Key] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [cropperFile, setCropperFile] = useState<File | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Link action state
  const [linkAction, setLinkAction] = useState<LinkAction>('none')
  const [selectedPackageId, setSelectedPackageId] = useState<string>('')
  const [packages, setPackages] = useState<Package[]>([])
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [packageError, setPackageError] = useState<string | null>(null)

  // Book state
  const [selectedBookId, setSelectedBookId] = useState<string>('')
  const [books, setBooks] = useState<Book[]>([])
  const [booksLoading, setBooksLoading] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)

  // Manage preview URL for cropped image
  useEffect(() => {
    if (imageFile.length > 0) {
      const url = URL.createObjectURL(imageFile[0])
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [imageFile])

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: '', subtitle: '', click_url: '',
      display_order: NaN, is_active: true, start_date: '', end_date: '',
    },
  })

  const isActive = watch('is_active')

  // Fetch packages, package types, and books when modal opens
  useEffect(() => {
    if (open) {
      fetchPackagesAndTypes()
      fetchBooks()
    }
  }, [open])

  const fetchPackagesAndTypes = async () => {
    setPackagesLoading(true)

    // Fetch packages (admin API — always populates package_type_id)
    try {
      const pkgResponse = await packagesService.getAll({ is_active: true, limit: 100 })
      if (pkgResponse.success && pkgResponse.data) {
        setPackages(pkgResponse.data.entities || [])
      }
    } catch {
      console.error('Failed to fetch packages')
    }

    // Fetch package types as fallback for filtering
    try {
      const typesResponse = await packageTypesService.getAllPublic()
      if (typesResponse.success && typesResponse.data) {
        setPackageTypes(typesResponse.data)
      }
    } catch {
      console.error('Failed to fetch package types')
    }

    setPackagesLoading(false)
  }

  const fetchBooks = async () => {
    setBooksLoading(true)
    try {
      const response = await booksService.getAll({ limit: 100, is_available: true })
      if (response.success && response.data) {
        setBooks((response.data.entities || []).filter((b) => b.ebook))
      }
    } catch {
      console.error('Failed to fetch books')
    }
    setBooksLoading(false)
  }

  // Filter packages by type name from the populated package_type_id
  const getTypeName = (pkg: Package): string => {
    const ref = pkg.package_type_id
    if (typeof ref === 'object' && ref !== null && 'name' in ref) {
      return (ref as { name: string }).name.toLowerCase()
    }
    return ''
  }

  // Primary: match by populated name. Fallback: match by type ID lookup.
  const matchesType = (pkg: Package, typeName: string): boolean => {
    // Try populated name first
    const name = getTypeName(pkg)
    if (name) return name === typeName

    // Fallback: match via package types list
    const typeId = packageTypes.find((t) => t.name.toLowerCase() === typeName)?._id
    if (!typeId) return false
    const ref = pkg.package_type_id
    const pkgTypeId = typeof ref === 'object' && ref !== null ? ref._id : (ref as unknown as string)
    return pkgTypeId === typeId
  }

  const theoryPackages = packages.filter((p) => matchesType(p, 'theory'))
  const practicalPackages = packages.filter((p) => matchesType(p, 'practical'))

  const relevantPackages = linkAction === 'theory_package' ? theoryPackages : practicalPackages

  useEffect(() => {
    if (open) {
      setImageFile([])
      setUploadProgress(null)
      setImageError(null)
      setPackageError(null)
      setBookError(null)
      if (mode === 'edit' && banner) {
        reset({
          title: banner.title,
          subtitle: banner.subtitle || '',
          click_url: banner.click_url || '',
          display_order: banner.display_order,
          is_active: banner.is_active,
          start_date: banner.start_date ? new Date(banner.start_date).toISOString().split('T')[0] : '',
          end_date: banner.end_date ? new Date(banner.end_date).toISOString().split('T')[0] : '',
        })
        setExistingImageUrl(banner.image_url)
        setExistingS3Key(banner.image_s3_key)
        setLinkAction(deriveLinkAction(banner))
        setSelectedPackageId(banner.target_package_id || '')
        setSelectedBookId(banner.target_book_id || '')
      } else {
        reset({
          title: '', subtitle: '', click_url: '',
          display_order: NaN, is_active: true,
          start_date: new Date().toISOString().split('T')[0], end_date: '',
        })
        setExistingImageUrl(null)
        setExistingS3Key(null)
        setLinkAction('none')
        setSelectedPackageId('')
        setSelectedBookId('')
      }
    }
  }, [open, mode, banner, reset])

  const hasImage = imageFile.length > 0 || !!existingImageUrl
  const isPackageAction = linkAction === 'theory_package' || linkAction === 'practical_package'

  const handleFormSubmit = async (data: BannerFormValues) => {
    // Validate image
    if (!hasImage) {
      setImageError('Banner image is required')
      return
    }
    setImageError(null)

    // Validate package selection for package banner types
    if (isPackageAction && !selectedPackageId) {
      setPackageError('Please select a package')
      return
    }
    setPackageError(null)

    // Validate book selection for ebook banner type
    if (linkAction === 'ebook' && !selectedBookId) {
      setBookError('Please select a book')
      return
    }
    setBookError(null)

    try {
      let imageUrl = existingImageUrl || ''
      let imageS3Key = existingS3Key || undefined

      // Upload new image if selected
      if (imageFile.length > 0) {
        setUploadProgress(0)
        try {
          const result = await bannersService.uploadImage(imageFile[0], setUploadProgress)
          imageUrl = result.imageUrl
          imageS3Key = result.s3Key
        } catch (err: any) {
          toast.error(err.message || 'Failed to upload image')
          setUploadProgress(null)
          return
        }
        setUploadProgress(null)
      }

      // Build form data based on link action
      let bannerType: BannerType = 'generic'
      let clickUrl: string | undefined = undefined
      let linkType: 'internal' | 'external' | 'none' = 'none'
      let targetPackageId: string | null = null
      let targetBookId: string | null = null

      if (linkAction === 'external_url') {
        bannerType = 'generic'
        linkType = 'external'
        clickUrl = data.click_url || undefined
      } else if (linkAction === 'theory_package') {
        bannerType = 'theory_package'
        linkType = 'internal'
        targetPackageId = selectedPackageId
      } else if (linkAction === 'practical_package') {
        bannerType = 'practical_package'
        linkType = 'internal'
        targetPackageId = selectedPackageId
      } else if (linkAction === 'ebook') {
        bannerType = 'ebook'
        linkType = 'internal'
        targetBookId = selectedBookId
      }

      const formData: BannerFormData = {
        title: data.title,
        subtitle: data.subtitle || undefined,
        image_url: imageUrl,
        image_s3_key: imageS3Key,
        click_url: clickUrl,
        link_type: linkType,
        banner_type: bannerType,
        target_package_id: targetPackageId,
        target_book_id: targetBookId,
        display_order: data.display_order && !isNaN(data.display_order) ? data.display_order : undefined,
        is_active: data.is_active,
        start_date: data.start_date,
        end_date: data.end_date || undefined,
      }
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleClose = () => { if (!isSubmitting && uploadProgress === null) onClose() }

  const handleRemoveExistingImage = () => {
    setExistingImageUrl(null)
    setExistingS3Key(null)
  }

  const handleFileSelected = (files: File[]) => {
    if (files.length > 0) {
      setCropperFile(files[0])
      setShowCropper(true)
    }
    setImageError(null)
  }

  const handleCropComplete = (croppedFile: File) => {
    setImageFile([croppedFile])
    setShowCropper(false)
    setCropperFile(null)
    setImageError(null)
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setCropperFile(null)
  }

  const handleLinkActionChange = (value: LinkAction) => {
    setLinkAction(value)
    setSelectedPackageId('')
    setSelectedBookId('')
    setPackageError(null)
    setBookError(null)
  }

  const isUploading = uploadProgress !== null

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Banner' : 'Edit Banner'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new promotional banner.' : 'Update the banner details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input id="title" placeholder="Banner title" disabled={isSubmitting || isUploading} {...register('title')} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input id="subtitle" placeholder="Optional subtitle" disabled={isSubmitting || isUploading} {...register('subtitle')} />
          </div>

          {/* Banner Image Upload */}
          <div className="space-y-2">
            <Label>Banner Image <span className="text-red-500">*</span></Label>
            {imageFile.length > 0 ? (
              <div className="relative rounded-lg border overflow-hidden">
                <img src={previewUrl!} alt="Cropped banner" className="w-full h-32 object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => setImageFile([])}
                  disabled={isSubmitting || isUploading}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <p className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/80">
                  Cropped image ready. Click X to choose a different one.
                </p>
              </div>
            ) : existingImageUrl ? (
              <div className="relative rounded-lg border overflow-hidden">
                <img src={existingImageUrl} alt="Banner" className="w-full h-32 object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={handleRemoveExistingImage}
                  disabled={isSubmitting || isUploading}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <p className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/80">
                  Current image. Upload a new one to replace.
                </p>
              </div>
            ) : (
              <FileUpload
                accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }}
                maxSize={5 * 1024 * 1024}
                maxFiles={1}
                value={[]}
                onChange={handleFileSelected}
                disabled={isSubmitting || isUploading}
                label="Upload banner image"
                description="JPEG, PNG, or WebP. Max 5MB. Will be cropped to banner ratio."
              />
            )}
            {uploadProgress !== null && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
              </div>
            )}
            {imageError && <p className="text-sm text-red-500">{imageError}</p>}
          </div>

          {/* Link Action */}
          <div className="space-y-2">
            <Label>Banner Click Action</Label>
            <Select
              value={linkAction}
              onValueChange={(v) => handleLinkActionChange(v as LinkAction)}
              disabled={isSubmitting || isUploading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select action..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Action</SelectItem>
                <SelectItem value="external_url">External URL</SelectItem>
                <SelectItem value="theory_package">Theory Package</SelectItem>
                <SelectItem value="practical_package">Practical Package</SelectItem>
                <SelectItem value="ebook">Book</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {linkAction === 'none' && 'Banner will be display-only, no navigation on tap.'}
              {linkAction === 'external_url' && 'Opens an external URL in the browser when tapped.'}
              {linkAction === 'theory_package' && 'Navigates to the selected theory package screen when tapped.'}
              {linkAction === 'practical_package' && 'Navigates to the selected practical package screen when tapped.'}
              {linkAction === 'ebook' && 'Opens the selected book details page when tapped.'}
            </p>
          </div>

          {/* External URL input - shown only for external_url action */}
          {linkAction === 'external_url' && (
            <div className="space-y-2">
              <Label htmlFor="click_url">Click URL <span className="text-red-500">*</span></Label>
              <Input id="click_url" placeholder="https://..." disabled={isSubmitting || isUploading} {...register('click_url')} />
              {errors.click_url && <p className="text-sm text-red-500">{errors.click_url.message}</p>}
            </div>
          )}

          {/* Package selector - shown for theory/practical package actions */}
          {isPackageAction && (
            <div className="space-y-2">
              <Label>
                Select {linkAction === 'theory_package' ? 'Theory' : 'Practical'} Package{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedPackageId}
                onValueChange={(v) => { setSelectedPackageId(v); setPackageError(null) }}
                disabled={isSubmitting || isUploading || packagesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    packagesLoading
                      ? 'Loading packages...'
                      : `Select a ${linkAction === 'theory_package' ? 'theory' : 'practical'} package`
                  } />
                </SelectTrigger>
                <SelectContent>
                  {relevantPackages.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No {linkAction === 'theory_package' ? 'theory' : 'practical'} packages found
                    </div>
                  ) : (
                    relevantPackages.map((pkg) => (
                      <SelectItem key={pkg._id} value={pkg._id}>
                        {pkg.name}
                        {pkg.subject_id?.name ? ` (${pkg.subject_id.name})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {packageError && <p className="text-sm text-red-500">{packageError}</p>}
            </div>
          )}

          {/* Book selector - shown for ebook action */}
          {linkAction === 'ebook' && (
            <div className="space-y-2">
              <Label>
                Select Book <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedBookId}
                onValueChange={(v) => { setSelectedBookId(v); setBookError(null) }}
                disabled={isSubmitting || isUploading || booksLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    booksLoading ? 'Loading books...' : 'Select a book'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {books.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No ebooks found
                    </div>
                  ) : (
                    books.map((book) => (
                      <SelectItem key={book._id} value={book._id}>
                        {book.title}
                        {book.author ? ` — ${book.author}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {bookError && <p className="text-sm text-red-500">{bookError}</p>}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date <span className="text-red-500">*</span></Label>
              <Input id="start_date" type="date" disabled={isSubmitting || isUploading} {...register('start_date')} />
              {errors.start_date && <p className="text-sm text-red-500">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input id="end_date" type="date" disabled={isSubmitting || isUploading} {...register('end_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_order">Order</Label>
              <Input id="display_order" type="number" min={0} disabled={isSubmitting || isUploading} {...register('display_order', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-sm">Active</Label>
              <p className="text-xs text-muted-foreground">{isActive ? 'Banner is visible' : 'Banner is hidden'}</p>
            </div>
            <Switch id="is_active" checked={isActive} onCheckedChange={(c) => setValue('is_active', c)} disabled={isSubmitting || isUploading} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting || isUploading}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting || isUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isUploading ? 'Uploading...' : mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Add Banner' : 'Update Banner'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Image Cropper Dialog */}
    <ImageCropper
      file={cropperFile}
      open={showCropper}
      onClose={handleCropCancel}
      onCropComplete={handleCropComplete}
      aspectRatio={BANNER_ASPECT_RATIO}
      title="Crop Banner Image"
      description="Adjust the crop area to fit the banner dimensions (18:7 ratio)."
    />
    </>
  )
}
