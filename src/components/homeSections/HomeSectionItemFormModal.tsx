import { useEffect, useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FileUpload } from '@/components/common/FileUpload'
import { ImageCropper } from '@/components/common/ImageCropper'
import { Loader2, X, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  HomeSectionItem, HomeSectionItemFormData,
  CardTypeInfo,
  homeSectionsService,
} from '@/services/homeSections.service'
import { Package, packagesService } from '@/services/packages.service'
import { PackageType, packageTypesService } from '@/services/packageTypes.service'
import { Book, booksService } from '@/services/books.service'
import { LiveSession, liveSessionsService } from '@/services/liveSessions.service'

// ─── Constants ──────────────────────────────────────────────────────────────

const hexColorRegex = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/

const optionalHexColor = z.string().optional().refine(
  val => !val || hexColorRegex.test(val),
  { message: 'Invalid hex color' },
)

const formSchema = z.object({
  card_type: z.string().min(1, 'Card type is required'),
  title: z.string().max(200).optional(),
  subtitle: z.string().max(300).optional(),
  description: z.string().max(2000).optional(),
  tag_label: z.string().max(100).optional(),
  tag_color: optionalHexColor,
  background_color: optionalHexColor,
  text_color: optionalHexColor,
  border_color: optionalHexColor,
  button_text: z.string().max(100).optional(),
  button_color: optionalHexColor,
  button_text_color: optionalHexColor,
  external_url: z.string().optional().refine(
    val => !val || /^https?:\/\//.test(val), { message: 'Invalid URL' },
  ),
  secondary_button_text: z.string().max(100).optional(),
  secondary_external_url: z.string().optional().refine(
    val => !val || /^https?:\/\//.test(val), { message: 'Invalid URL' },
  ),
  metadata: z.array(z.object({
    label: z.string().min(1, 'Label is required'),
    value: z.string().min(1, 'Value is required'),
    icon_url: z.string().optional(),
  })).optional(),
  display_order: z.coerce.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})

type FormValues = z.infer<typeof formSchema>

const DEFAULT_VALUES: FormValues = {
  card_type: 'info_card',
  title: '',
  subtitle: '',
  description: '',
  tag_label: '',
  tag_color: '',
  background_color: '',
  text_color: '',
  border_color: '',
  button_text: '',
  button_color: '',
  button_text_color: '',
  external_url: '',
  secondary_button_text: '',
  secondary_external_url: '',
  metadata: [],
  display_order: 0,
  is_active: true,
}

// ─── Click action types (same as banners) ────────────────────────────────────

type ClickAction = 'none' | 'external_url' | 'theory_package' | 'practical_package' | 'ebook' | 'live_session'

/** Derive click action from stored item fields */
function deriveClickAction(item: HomeSectionItem): ClickAction {
  if (item.link_type === 'external') return 'external_url'
  if (item.link_type === 'internal') {
    if (item.internal_route === '/revision-series') return 'theory_package'
    if (item.internal_route === '/practical-series') return 'practical_package'
    if (item.internal_route === '/ebook-store') return 'ebook'
    if (item.internal_route === '/session/:id') return 'live_session'
  }
  return 'none'
}

// (Complex entity helpers removed — using simplified banner-style click actions)

// ─── Main Component ─────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionId: string
  mode: 'create' | 'edit'
  item?: HomeSectionItem | null
  onSuccess: () => void
}

export function HomeSectionItemFormModal({
  open, onOpenChange, sectionId, mode, item, onSuccess,
}: Props) {
  // ── Reference data ─────────────────────────────────────────────────────
  const [cardTypes, setCardTypes] = useState<CardTypeInfo[]>([])
  const [refDataReady, setRefDataReady] = useState(false)

  // ── Click action state (same pattern as BannerFormModal) ──────────────
  const [primaryClickAction, setPrimaryClickAction] = useState<ClickAction>('none')
  const [secondaryClickAction, setSecondaryClickAction] = useState<ClickAction>('none')
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [selectedBookId, setSelectedBookId] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [selectedSecondaryPackageId, setSelectedSecondaryPackageId] = useState('')
  const [selectedSecondaryBookId, setSelectedSecondaryBookId] = useState('')
  const [selectedSecondarySessionId, setSelectedSecondarySessionId] = useState('')

  // ── Package & book data ───────────────────────────────────────────────
  const [packages, setPackages] = useState<Package[]>([])
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [booksLoading, setBooksLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)

  // ── Image / icon state ──────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File[]>([])
  const [iconFile, setIconFile] = useState<File[]>([])
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [existingIconUrl, setExistingIconUrl] = useState<string | null>(null)
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [showIconCropper, setShowIconCropper] = useState(false)
  const [imageCropFile, setImageCropFile] = useState<File | null>(null)
  const [iconCropFile, setIconCropFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  // ── Form ────────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formReady, setFormReady] = useState(false)

  const form = useForm({
    resolver: zodResolver(formSchema) as any,
    defaultValues: DEFAULT_VALUES,
  })

  const { register, handleSubmit, watch, setValue, reset, control, formState: { errors } } = form

  const { fields: metadataFields, append: appendMetadata, remove: removeMetadata } = useFieldArray({
    control,
    name: 'metadata',
  })

  // ── Package filtering (same as BannerFormModal) ───────────────────────

  const getTypeName = (pkg: Package): string => {
    const ref = pkg.package_type_id
    if (typeof ref === 'object' && ref !== null && 'name' in ref) {
      return (ref as { name: string }).name.toLowerCase()
    }
    return ''
  }

  const matchesType = (pkg: Package, typeName: string): boolean => {
    const name = getTypeName(pkg)
    if (name) return name === typeName
    const typeId = packageTypes.find((t) => t.name.toLowerCase() === typeName)?._id
    if (!typeId) return false
    const ref = pkg.package_type_id
    const pkgTypeId = typeof ref === 'object' && ref !== null ? ref._id : (ref as unknown as string)
    return pkgTypeId === typeId
  }

  const theoryPackages = packages.filter((p) => matchesType(p, 'theory'))
  const practicalPackages = packages.filter((p) => matchesType(p, 'practical'))

  // ── 1. Fetch reference data when dialog opens ───────────────────────────

  useEffect(() => {
    if (!open) return
    setRefDataReady(false)

    // Fetch card types, packages, package types, and books
    homeSectionsService.getCardTypes().then(ctRes => {
      const types = ctRes.success && ctRes.data ? ctRes.data.card_types : []
      setCardTypes(types)
      setRefDataReady(true)
    })

    // Fetch packages
    setPackagesLoading(true)
    packagesService.getAll({ is_active: true, limit: 100 } as any).then(res => {
      if (res.success && res.data) setPackages(res.data.entities || [])
    }).catch(() => {}).finally(() => setPackagesLoading(false))

    packageTypesService.getAllPublic().then(res => {
      if (res.success && res.data) setPackageTypes(res.data)
    }).catch(() => {})

    // Fetch books
    setBooksLoading(true)
    booksService.getAll({ limit: 100, is_available: true } as any).then(res => {
      if (res.success && res.data) setBooks((res.data.entities || []).filter((b: Book) => b.ebook))
    }).catch(() => {}).finally(() => setBooksLoading(false))

    // Fetch live sessions
    setSessionsLoading(true)
    liveSessionsService.getAll({ limit: 100, publish_status: 'published' }).then(res => {
      if (res.success && res.data) setSessions((res.data.entities || []).filter((s: LiveSession) => s.status === 'scheduled' || s.status === 'live'))
    }).catch(() => {}).finally(() => setSessionsLoading(false))
  }, [open])

  // ── 2. Initialize form once reference data is ready ─────────────────────

  useEffect(() => {
    if (!open || !refDataReady) return

    // Clear transient state
    setImageFile([])
    setIconFile([])
    setUploadProgress(null)

    if (mode === 'edit' && item) {
      reset({
        card_type: item.card_type || 'info_card',
        title: item.title || '',
        subtitle: item.subtitle || '',
        description: item.description || '',
        tag_label: item.tag_label || '',
        tag_color: item.tag_color || '',
        background_color: item.background_color || '',
        text_color: item.text_color || '',
        border_color: item.border_color || '',
        button_text: item.button_text || '',
        button_color: item.button_color || '',
        button_text_color: item.button_text_color || '',
        external_url: item.external_url || '',
        secondary_button_text: item.secondary_button_text || '',
        secondary_external_url: item.secondary_external_url || '',
        metadata: (item.metadata || []).map(m => ({
          label: m.label,
          value: m.value,
          icon_url: m.icon_url || '',
        })),
        display_order: item.display_order ?? 0,
        is_active: item.is_active ?? true,
      })
      setExistingImageUrl(item.image_url || null)
      setExistingIconUrl(item.icon_url || null)

      // Derive click actions from stored data
      setPrimaryClickAction(deriveClickAction(item))
      setSelectedPackageId(item.internal_params?.packageId || '')
      setSelectedBookId(item.internal_params?.bookId || '')
      setSelectedSessionId(item.internal_params?.id || '')

      // Secondary
      const secAction = (() => {
        if (item.secondary_link_type === 'external') return 'external_url' as ClickAction
        if (item.secondary_link_type === 'internal') {
          if (item.secondary_internal_route === '/revision-series') return 'theory_package' as ClickAction
          if (item.secondary_internal_route === '/practical-series') return 'practical_package' as ClickAction
          if (item.secondary_internal_route === '/ebook-store') return 'ebook' as ClickAction
          if (item.secondary_internal_route === '/session/:id') return 'live_session' as ClickAction
        }
        return 'none' as ClickAction
      })()
      setSecondaryClickAction(secAction)
      setSelectedSecondaryPackageId(item.secondary_internal_params?.packageId || '')
      setSelectedSecondaryBookId(item.secondary_internal_params?.bookId || '')
      setSelectedSecondarySessionId(item.secondary_internal_params?.id || '')
    } else {
      reset(DEFAULT_VALUES)
      setExistingImageUrl(null)
      setExistingIconUrl(null)
      setPrimaryClickAction('none')
      setSecondaryClickAction('none')
      setSelectedPackageId('')
      setSelectedBookId('')
      setSelectedSessionId('')
      setSelectedSecondaryPackageId('')
      setSelectedSecondaryBookId('')
      setSelectedSecondarySessionId('')
    }

    setFormReady(true)
  }, [open, refDataReady])

  // Clean up on close
  useEffect(() => {
    if (!open) {
      setFormReady(false)
      setRefDataReady(false)
    }
  }, [open])

  // ── Image handling ──────────────────────────────────────────────────────

  const handleImageSelect = useCallback((files: File[]) => {
    if (files.length > 0) {
      setImageCropFile(files[0])
      setShowImageCropper(true)
    }
  }, [])

  const handleIconSelect = useCallback((files: File[]) => {
    if (files.length > 0) {
      setIconCropFile(files[0])
      setShowIconCropper(true)
    }
  }, [])

  // ── Form submit ─────────────────────────────────────────────────────────

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    try {
      let imageS3Key = item?.image_s3_key || undefined
      let iconS3Key = item?.icon_s3_key || undefined
      let imageUrl = existingImageUrl || undefined
      let iconUrl = existingIconUrl || undefined

      // Upload image if new file selected
      if (imageFile.length > 0) {
        setUploadProgress(0)
        const result = await homeSectionsService.uploadItemImage(
          sectionId, imageFile[0], (p) => setUploadProgress(p),
        )
        imageS3Key = result.s3Key
        imageUrl = result.imageUrl
        setUploadProgress(null)
      }

      // Upload icon if new file selected
      if (iconFile.length > 0) {
        setUploadProgress(0)
        const result = await homeSectionsService.uploadItemImage(
          sectionId, iconFile[0], (p) => setUploadProgress(p),
        )
        iconS3Key = result.s3Key
        iconUrl = result.imageUrl
        setUploadProgress(null)
      }

      // Build submission data — map click actions to backend fields (same as banners)
      const resolveAction = (action: ClickAction, pkgId: string, bookId: string, sessionId: string): {
        link_type: string
        internal_route?: string
        internal_params?: Record<string, string>
      } => {
        switch (action) {
          case 'theory_package':
            return { link_type: 'internal', internal_route: '/revision-series', internal_params: { packageId: pkgId } }
          case 'practical_package':
            return { link_type: 'internal', internal_route: '/practical-series', internal_params: { packageId: pkgId } }
          case 'ebook':
            return { link_type: 'internal', internal_route: '/ebook-store', internal_params: { bookId } }
          case 'live_session':
            return { link_type: 'internal', internal_route: '/session/:id', internal_params: { id: sessionId } }
          case 'external_url':
            return { link_type: 'external' }
          default:
            return { link_type: 'none' }
        }
      }

      const primary = resolveAction(primaryClickAction, selectedPackageId, selectedBookId, selectedSessionId)
      const secondary = resolveAction(secondaryClickAction, selectedSecondaryPackageId, selectedSecondaryBookId, selectedSecondarySessionId)

      const submitData: HomeSectionItemFormData = {
        card_type: data.card_type,
        title: data.title || undefined,
        subtitle: data.subtitle || undefined,
        description: data.description || undefined,
        image_url: imageUrl || undefined,
        image_s3_key: imageS3Key || undefined,
        icon_url: iconUrl || undefined,
        icon_s3_key: iconS3Key || undefined,
        tag_label: data.tag_label || undefined,
        tag_color: data.tag_color || undefined,
        background_color: data.background_color || undefined,
        text_color: data.text_color || undefined,
        border_color: data.border_color || undefined,
        button_text: data.button_text || undefined,
        button_color: data.button_color || undefined,
        button_text_color: data.button_text_color || undefined,
        link_type: primary.link_type,
        external_url: primaryClickAction === 'external_url' ? data.external_url || undefined : undefined,
        internal_route: 'internal_route' in primary ? primary.internal_route : undefined,
        internal_params: 'internal_params' in primary ? primary.internal_params : undefined,
        secondary_button_text: data.secondary_button_text || undefined,
        secondary_link_type: secondary.link_type,
        secondary_external_url: secondaryClickAction === 'external_url' ? data.secondary_external_url || undefined : undefined,
        secondary_internal_route: 'internal_route' in secondary ? secondary.internal_route : undefined,
        secondary_internal_params: 'internal_params' in secondary ? secondary.internal_params : undefined,
        metadata: data.metadata && data.metadata.length > 0 ? data.metadata : undefined,
        display_order: data.display_order,
        is_active: data.is_active,
      }

      // Clear image/icon fields if removed (send null so backend clears them)
      if (!imageFile.length && !existingImageUrl) {
        submitData.image_url = undefined
        submitData.image_s3_key = undefined
      }
      if (!iconFile.length && !existingIconUrl) {
        submitData.icon_url = undefined
        submitData.icon_s3_key = undefined
      }

      if (mode === 'edit' && item) {
        const res = await homeSectionsService.updateItem(sectionId, item._id, submitData)
        if (res.success) {
          toast.success('Item updated successfully')
          onSuccess()
          onOpenChange(false)
        } else {
          toast.error(res.message || 'Failed to update item')
        }
      } else {
        const res = await homeSectionsService.createItem(sectionId, submitData)
        if (res.success) {
          toast.success('Item created successfully')
          onSuccess()
          onOpenChange(false)
        } else {
          toast.error(res.message || 'Failed to create item')
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Render click action section (same pattern as BannerFormModal) ────────

  const renderClickActionSection = (
    isSecondary: boolean,
    clickAction: ClickAction,
    setClickAction: (v: ClickAction) => void,
    pkgId: string,
    setPkgId: (v: string) => void,
    bookId: string,
    setBookId: (v: string) => void,
    sessionId: string,
    setSessionId: (v: string) => void,
  ) => {
    const externalUrlField = isSecondary ? 'secondary_external_url' : 'external_url'
    const buttonTextField = isSecondary ? 'secondary_button_text' : 'button_text'
    const isPackageAction = clickAction === 'theory_package' || clickAction === 'practical_package'
    const relevantPackages = clickAction === 'theory_package' ? theoryPackages : practicalPackages

    return (
      <div className="space-y-3">
        {/* Button Text */}
        <div className="space-y-1">
          <Label className="text-xs">{isSecondary ? 'Secondary ' : ''}Button Text</Label>
          <Input className="h-8 text-xs" {...register(buttonTextField as any)} placeholder="e.g. View Details" />
        </div>

        {/* Click Action */}
        <div className="space-y-1">
          <Label className="text-xs">{isSecondary ? 'Secondary ' : ''}Click Action</Label>
          <Select
            value={clickAction}
            onValueChange={(v) => { setClickAction(v as ClickAction); setPkgId(''); setBookId(''); setSessionId('') }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Action</SelectItem>
              <SelectItem value="external_url">External URL</SelectItem>
              <SelectItem value="theory_package">Theory Package</SelectItem>
              <SelectItem value="practical_package">Practical Package</SelectItem>
              <SelectItem value="ebook">Book</SelectItem>
              <SelectItem value="live_session">Live Session</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {clickAction === 'none' && 'No navigation on tap.'}
            {clickAction === 'external_url' && 'Opens an external URL in the browser.'}
            {clickAction === 'theory_package' && 'Navigates to the selected theory package screen.'}
            {clickAction === 'practical_package' && 'Navigates to the selected practical package screen.'}
            {clickAction === 'ebook' && 'Opens the selected book details page.'}
            {clickAction === 'live_session' && 'Opens the selected live session details.'}
          </p>
        </div>

        {/* External URL input */}
        {clickAction === 'external_url' && (
          <div className="space-y-1">
            <Label className="text-xs">External URL *</Label>
            <Input className="h-8 text-xs" {...register(externalUrlField as any)} placeholder="https://..." />
            {(errors as any)?.[externalUrlField] && (
              <p className="text-xs text-destructive">{(errors as any)[externalUrlField]?.message}</p>
            )}
          </div>
        )}

        {/* Package selector */}
        {isPackageAction && (
          <div className="space-y-1">
            <Label className="text-xs">
              Select {clickAction === 'theory_package' ? 'Theory' : 'Practical'} Package *
            </Label>
            <Select
              value={pkgId}
              onValueChange={setPkgId}
              disabled={packagesLoading}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={
                  packagesLoading ? 'Loading packages...' : `Select a ${clickAction === 'theory_package' ? 'theory' : 'practical'} package`
                } />
              </SelectTrigger>
              <SelectContent>
                {relevantPackages.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No {clickAction === 'theory_package' ? 'theory' : 'practical'} packages found
                  </div>
                ) : (
                  relevantPackages.map((pkg) => (
                    <SelectItem key={pkg._id} value={pkg._id}>
                      {pkg.name}
                      {pkg.subject_id && typeof pkg.subject_id === 'object' && 'name' in pkg.subject_id ? ` (${(pkg.subject_id as any).name})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Book selector */}
        {clickAction === 'ebook' && (
          <div className="space-y-1">
            <Label className="text-xs">Select Book *</Label>
            <Select
              value={bookId}
              onValueChange={setBookId}
              disabled={booksLoading}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={booksLoading ? 'Loading books...' : 'Select a book'} />
              </SelectTrigger>
              <SelectContent>
                {books.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No ebooks found</div>
                ) : (
                  books.map((book) => (
                    <SelectItem key={book._id} value={book._id}>
                      {book.title}{book.author ? ` — ${book.author}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Live session selector */}
        {clickAction === 'live_session' && (
          <div className="space-y-1">
            <Label className="text-xs">Select Live Session *</Label>
            <Select
              value={sessionId}
              onValueChange={setSessionId}
              disabled={sessionsLoading}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={sessionsLoading ? 'Loading sessions...' : 'Select a session'} />
              </SelectTrigger>
              <SelectContent>
                {sessions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No scheduled sessions found</div>
                ) : (
                  sessions.map((session) => (
                    <SelectItem key={session._id} value={session._id}>
                      {session.title}
                      {session.scheduled_start_time ? ` — ${new Date(session.scheduled_start_time).toLocaleDateString()}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Edit Item' : 'Add Item'}</DialogTitle>
            <DialogDescription>
              {mode === 'edit' ? 'Update this home section item.' : 'Add a new item to this section.'}
            </DialogDescription>
          </DialogHeader>

          {!formReady ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* ── Card Type ── */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Card Type *</Label>
                <Select value={watch('card_type')} onValueChange={(val) => setValue('card_type', val)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cardTypes.map(ct => (
                      <SelectItem key={ct.key} value={ct.key}>
                        <div>
                          <span>{ct.label}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{ct.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.card_type && (
                  <p className="text-xs text-destructive">{errors.card_type.message}</p>
                )}
              </div>

              {/* ── Content Fields ── */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Content</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input className="h-8 text-xs" {...register('title')} placeholder="Item title" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Subtitle</Label>
                    <Input className="h-8 text-xs" {...register('subtitle')} placeholder="Item subtitle" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea className="text-xs min-h-15" {...register('description')} placeholder="Item description" />
                </div>
              </div>

              {/* ── Tag ── */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Tag</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tag Label</Label>
                    <Input className="h-8 text-xs" {...register('tag_label')} placeholder="e.g. New, Popular" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tag Color</Label>
                    <Input className="h-8 text-xs" {...register('tag_color')} placeholder="#FF5733" />
                  </div>
                </div>
              </div>

              {/* ── Image & Icon ── */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Media</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Image</Label>
                    {existingImageUrl && !imageFile.length && (
                      <div className="relative mb-2">
                        <img src={existingImageUrl} alt="Current" className="w-full h-24 object-cover rounded border" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-5 w-5"
                          onClick={() => setExistingImageUrl(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {imageFile.length > 0 && (
                      <div className="relative mb-2">
                        <img src={URL.createObjectURL(imageFile[0])} alt="New" className="w-full h-24 object-cover rounded border" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-5 w-5"
                          onClick={() => setImageFile([])}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <FileUpload
                      accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
                      maxSize={5 * 1024 * 1024}
                      maxFiles={1}
                      value={[]}
                      onChange={handleImageSelect}
                      label="Upload image"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Icon</Label>
                    {existingIconUrl && !iconFile.length && (
                      <div className="relative mb-2">
                        <img src={existingIconUrl} alt="Current icon" className="w-12 h-12 object-contain rounded border" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-0 right-0 h-5 w-5"
                          onClick={() => setExistingIconUrl(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {iconFile.length > 0 && (
                      <div className="relative mb-2">
                        <img src={URL.createObjectURL(iconFile[0])} alt="New icon" className="w-12 h-12 object-contain rounded border" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-0 right-0 h-5 w-5"
                          onClick={() => setIconFile([])}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <FileUpload
                      accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
                      maxSize={2 * 1024 * 1024}
                      maxFiles={1}
                      value={[]}
                      onChange={handleIconSelect}
                      label="Upload icon"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* ── Styling ── */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Styling</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Background Color</Label>
                    <Input className="h-8 text-xs" {...register('background_color')} placeholder="#FFFFFF" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Text Color</Label>
                    <Input className="h-8 text-xs" {...register('text_color')} placeholder="#000000" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Border Color</Label>
                    <Input className="h-8 text-xs" {...register('border_color')} placeholder="#E5E7EB" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Button Color</Label>
                    <Input className="h-8 text-xs" {...register('button_color')} placeholder="#3B82F6" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Button Text Color</Label>
                    <Input className="h-8 text-xs" {...register('button_text_color')} placeholder="#FFFFFF" />
                  </div>
                </div>
              </div>

              {/* ── Primary Action ── */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Primary Action</h4>
                {renderClickActionSection(
                  false,
                  primaryClickAction, setPrimaryClickAction,
                  selectedPackageId, setSelectedPackageId,
                  selectedBookId, setSelectedBookId,
                  selectedSessionId, setSelectedSessionId,
                )}
              </div>

              {/* ── Secondary Action ── */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Secondary Action</h4>
                {renderClickActionSection(
                  true,
                  secondaryClickAction, setSecondaryClickAction,
                  selectedSecondaryPackageId, setSelectedSecondaryPackageId,
                  selectedSecondaryBookId, setSelectedSecondaryBookId,
                  selectedSecondarySessionId, setSelectedSecondarySessionId,
                )}
              </div>

              {/* ── Metadata ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Metadata</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => appendMetadata({ label: '', value: '', icon_url: '' })}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Entry
                  </Button>
                </div>
                {metadataFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input
                        className="h-7 text-xs"
                        {...register(`metadata.${index}.label`)}
                        placeholder="Label"
                      />
                      {errors.metadata?.[index]?.label && (
                        <p className="text-xs text-destructive">{errors.metadata[index]?.label?.message}</p>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input
                        className="h-7 text-xs"
                        {...register(`metadata.${index}.value`)}
                        placeholder="Value"
                      />
                      {errors.metadata?.[index]?.value && (
                        <p className="text-xs text-destructive">{errors.metadata[index]?.value?.message}</p>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input
                        className="h-7 text-xs"
                        {...register(`metadata.${index}.icon_url`)}
                        placeholder="Icon URL (optional)"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeMetadata(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* ── Settings ── */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Settings</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Display Order</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      min={0}
                      {...register('display_order', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <Switch
                      checked={watch('is_active') ?? true}
                      onCheckedChange={(val) => setValue('is_active', val)}
                    />
                    <Label className="text-xs">Active</Label>
                  </div>
                </div>
              </div>

              {/* ── Upload Progress ── */}
              {uploadProgress !== null && (
                <div className="space-y-1">
                  <Label className="text-xs">Uploading...</Label>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* ── Actions ── */}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === 'edit' ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Cropper */}
      <ImageCropper
        file={imageCropFile}
        open={showImageCropper}
        onClose={() => setShowImageCropper(false)}
        onCropComplete={(croppedFile) => {
          setImageFile([croppedFile])
          setShowImageCropper(false)
        }}
        aspectRatio={16 / 9}
        title="Crop Image"
      />

      {/* Icon Cropper */}
      <ImageCropper
        file={iconCropFile}
        open={showIconCropper}
        onClose={() => setShowIconCropper(false)}
        onCropComplete={(croppedFile) => {
          setIconFile([croppedFile])
          setShowIconCropper(false)
        }}
        aspectRatio={1}
        title="Crop Icon"
      />
    </>
  )
}
