import { useEffect, useState, useCallback, useRef } from 'react'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { FileUpload } from '@/components/common/FileUpload'
import { ImageCropper } from '@/components/common/ImageCropper'
import { Loader2, X, Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  HomeSectionItem, HomeSectionItemFormData,
  CardTypeInfo, NavigationTarget,
  homeSectionsService,
} from '@/services/homeSections.service'
import { packagesService } from '@/services/packages.service'
import { seriesService } from '@/services/series.service'
import { videosService } from '@/services/videos.service'
import { liveSessionsService } from '@/services/liveSessions.service'
import { documentsService } from '@/services/documents.service'

const hexColorRegex = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/

const metadataEntrySchema = z.object({
  label: z.string().min(1, 'Label is required'),
  value: z.string().min(1, 'Value is required'),
  icon_url: z.string().optional().or(z.literal('')),
})

const itemSchema = z.object({
  card_type: z.string().min(1, 'Card type is required'),
  title: z.string().max(200).optional().or(z.literal('')),
  subtitle: z.string().max(300).optional().or(z.literal('')),
  description: z.string().max(2000).optional().or(z.literal('')),
  tag_label: z.string().max(50).optional().or(z.literal('')),
  tag_color: z.string().regex(hexColorRegex, 'Invalid hex').optional().or(z.literal('')),
  background_color: z.string().regex(hexColorRegex, 'Invalid hex').optional().or(z.literal('')),
  text_color: z.string().regex(hexColorRegex, 'Invalid hex').optional().or(z.literal('')),
  border_color: z.string().regex(hexColorRegex, 'Invalid hex').optional().or(z.literal('')),
  button_text: z.string().max(100).optional().or(z.literal('')),
  button_color: z.string().regex(hexColorRegex, 'Invalid hex').optional().or(z.literal('')),
  button_text_color: z.string().regex(hexColorRegex, 'Invalid hex').optional().or(z.literal('')),
  link_type: z.enum(['none', 'internal', 'external']),
  external_url: z.string().optional().or(z.literal('')),
  navigation_target_key: z.string().optional().or(z.literal('')),
  navigation_params: z.record(z.string(), z.string()).optional(),
  secondary_button_text: z.string().max(100).optional().or(z.literal('')),
  secondary_link_type: z.enum(['none', 'internal', 'external']),
  secondary_external_url: z.string().optional().or(z.literal('')),
  secondary_navigation_target_key: z.string().optional().or(z.literal('')),
  secondary_navigation_params: z.record(z.string(), z.string()).optional(),
  metadata: z.array(metadataEntrySchema).max(10).optional(),
  display_order: z.number().int().min(0).optional().or(z.nan()),
  is_active: z.boolean(),
})

type ItemFormValues = z.infer<typeof itemSchema>

interface HomeSectionItemFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: HomeSectionItemFormData) => Promise<void>
  sectionId: string
  item?: HomeSectionItem | null
  mode: 'create' | 'edit'
}

function ColorSwatch({ color }: { color: string }) {
  const isValid = hexColorRegex.test(color)
  return (
    <div
      className="h-8 w-8 rounded border border-border shrink-0"
      style={{ backgroundColor: isValid ? color : '#e5e7eb' }}
    />
  )
}

const IMAGE_ASPECT_RATIO = 16 / 9
const ICON_ASPECT_RATIO = 1

// ─── Entity dropdown infrastructure ──────────────────────────────────
interface EntityOption {
  _id: string
  label: string
  extra?: Record<string, string>  // e.g. { file_url: '...' } for documents
}

/**
 * Resolves which entity list key to use for a given target+param combination.
 * Returns null if the param should NOT be a dropdown (boolean, enum, or free text).
 */
function getEntityListKey(targetKey: string, paramName: string): string | null {
  // Params handled by enum selects — not dropdowns
  if (paramName === 'packageType') return null
  // PDF viewer auto-populated fields
  if (paramName === 'pdfUrl' || (paramName === 'title' && targetKey === 'pdf_viewer')) return null

  // Non-ambiguous param names
  if (paramName === 'packageId') return 'packages'
  if (paramName === 'documentId') return 'documents'

  // Ambiguous 'id' param — depends on target
  if (paramName === 'id') {
    switch (targetKey) {
      case 'series_detail': return 'series'
      case 'lecture': return 'series'  // /lecture/:id uses series ID, not video ID
      case 'video_player': return 'videos'
      case 'live_session': return 'liveSessions'
    }
  }
  return null
}

/** Fetch entities from a service with { _id, label } format */
async function fetchEntityList(
  listKey: string,
  filterParams?: Record<string, string>,
): Promise<EntityOption[]> {
  try {
    const params = { page: 1, limit: 100, ...filterParams }
    let res: any
    switch (listKey) {
      case 'packages':
        res = await packagesService.getAll(params)
        break
      case 'series':
        res = await seriesService.getAll(params as any)
        break
      case 'videos':
        res = await videosService.getAll(params as any)
        break
      case 'liveSessions':
        res = await liveSessionsService.getAll(params as any)
        break
      case 'documents':
        res = await documentsService.getAll(params as any)
        break
      default:
        return []
    }

    if (!res?.success || !res?.data?.entities) return []

    switch (listKey) {
      case 'packages':
        return res.data.entities.map((e: any) => ({
          _id: e._id,
          label: e.name,
          extra: { packageType: e.package_type_id?.name || '' },
        }))
      case 'series':
        return res.data.entities.map((e: any) => ({ _id: e._id, label: e.name }))
      case 'videos':
        return res.data.entities.map((e: any) => ({ _id: e._id, label: e.title }))
      case 'liveSessions':
        return res.data.entities.map((e: any) => ({ _id: e._id, label: e.title }))
      case 'documents':
        return res.data.entities.map((e: any) => ({
          _id: e._id,
          label: e.title,
          extra: { file_url: e.file_url },
        }))
      default:
        return []
    }
  } catch (err) {
    console.error(`Failed to fetch ${listKey}:`, err)
    return []
  }
}

const defaultValues: ItemFormValues = {
  card_type: '',
  title: '', subtitle: '', description: '',
  tag_label: '', tag_color: '',
  background_color: '', text_color: '', border_color: '',
  button_text: '', button_color: '', button_text_color: '',
  link_type: 'none',
  external_url: '',
  navigation_target_key: '',
  navigation_params: {},
  secondary_button_text: '',
  secondary_link_type: 'none',
  secondary_external_url: '',
  secondary_navigation_target_key: '',
  secondary_navigation_params: {},
  metadata: [],
  display_order: NaN,
  is_active: true,
}

/** Searchable combobox for selecting an entity by name */
function EntityCombobox({
  items, loading, value, onSelect, placeholder, disabled,
}: {
  items: EntityOption[]
  loading: boolean
  value: string
  onSelect: (id: string) => void
  placeholder: string
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const selectedItem = items.find(i => i._id === value)

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between text-xs font-normal"
          disabled={disabled || loading}
        >
          <span className="truncate">
            {loading ? 'Loading...' : selectedItem ? selectedItem.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" sideOffset={4}>
        <Command>
          <CommandInput placeholder="Search..." className="h-8" />
          <CommandList className="max-h-50">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {items.map(item => (
                <CommandItem
                  key={item._id}
                  value={`${item.label} ${item._id}`}
                  keywords={[item.label]}
                  onSelect={() => {
                    onSelect(item._id)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-3 w-3", value === item._id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function HomeSectionItemFormModal({
  open, onClose, onSubmit, sectionId, item, mode,
}: HomeSectionItemFormModalProps) {
  // Reference data
  const [cardTypes, setCardTypes] = useState<CardTypeInfo[]>([])
  const [navTargets, setNavTargets] = useState<NavigationTarget[]>([])
  const [refLoading, setRefLoading] = useState(false)

  // Image state
  const [imageFile, setImageFile] = useState<File[]>([])
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [existingImageS3Key, setExistingImageS3Key] = useState<string | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageCropperFile, setImageCropperFile] = useState<File | null>(null)
  const [showImageCropper, setShowImageCropper] = useState(false)

  // Icon state
  const [iconFile, setIconFile] = useState<File[]>([])
  const [existingIconUrl, setExistingIconUrl] = useState<string | null>(null)
  const [existingIconS3Key, setExistingIconS3Key] = useState<string | null>(null)
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null)
  const [iconCropperFile, setIconCropperFile] = useState<File | null>(null)
  const [showIconCropper, setShowIconCropper] = useState(false)

  // Upload progress
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues,
  })

  const { fields: metadataFields, append: appendMeta, remove: removeMeta } = useFieldArray({
    control,
    name: 'metadata',
  })

  const isActive = watch('is_active')
  const cardType = watch('card_type')
  const linkType = watch('link_type')
  const navTargetKey = watch('navigation_target_key')
  const secondaryLinkType = watch('secondary_link_type')
  const secondaryNavTargetKey = watch('secondary_navigation_target_key')

  // Color watches for swatches
  const tagColor = watch('tag_color') || ''
  const bgColor = watch('background_color') || ''
  const txtColor = watch('text_color') || ''
  const borderColor = watch('border_color') || ''
  const btnColor = watch('button_color') || ''
  const btnTxtColor = watch('button_text_color') || ''

  // Entity dropdown state
  const [entityLists, setEntityLists] = useState<Record<string, EntityOption[]>>({})
  const [entityListsLoading, setEntityListsLoading] = useState<Record<string, boolean>>({})
  const fetchedKeysRef = useRef<Set<string>>(new Set())

  // Derived
  const selectedCardType = cardTypes.find(ct => ct.key === cardType)
  const selectedNavTarget = navTargets.find(t => t.key === navTargetKey)
  const secondaryNavTarget = navTargets.find(t => t.key === secondaryNavTargetKey)

  // Manage preview URLs
  useEffect(() => {
    if (imageFile.length > 0) {
      const url = URL.createObjectURL(imageFile[0])
      setImagePreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setImagePreviewUrl(null)
  }, [imageFile])

  useEffect(() => {
    if (iconFile.length > 0) {
      const url = URL.createObjectURL(iconFile[0])
      setIconPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setIconPreviewUrl(null)
  }, [iconFile])

  // ─── Entity dropdown fetching ──────────────────────────────────────
  const loadEntityList = useCallback(async (listKey: string, filterParams?: Record<string, string>) => {
    const cacheKey = filterParams ? `${listKey}:${JSON.stringify(filterParams)}` : listKey
    if (fetchedKeysRef.current.has(cacheKey)) return
    fetchedKeysRef.current.add(cacheKey)
    setEntityListsLoading(prev => ({ ...prev, [listKey]: true }))
    const items = await fetchEntityList(listKey, filterParams)
    setEntityLists(prev => ({ ...prev, [listKey]: items }))
    setEntityListsLoading(prev => ({ ...prev, [listKey]: false }))
  }, [])

  /** Fetch all entity lists needed by a given navigation target */
  const loadEntitiesForTarget = useCallback((target: NavigationTarget | undefined) => {
    if (!target) return
    const needed = new Set<string>()
    for (const param of target.params) {
      const key = getEntityListKey(target.key, param.name)
      if (key) needed.add(key)
    }
    needed.forEach(key => loadEntityList(key))
  }, [loadEntityList])

  // Fetch entity lists when primary nav target changes
  useEffect(() => {
    loadEntitiesForTarget(selectedNavTarget)
  }, [navTargetKey, selectedNavTarget, loadEntitiesForTarget])

  // Fetch entity lists when secondary nav target changes
  useEffect(() => {
    loadEntitiesForTarget(secondaryNavTarget)
  }, [secondaryNavTargetKey, secondaryNavTarget, loadEntitiesForTarget])

  // Cascading: refetch series list when packageId changes in series_detail target
  const primaryParams: Record<string, string> = watch('navigation_params') || {}
  const secondaryParams: Record<string, string> = watch('secondary_navigation_params') || {}

  // Cascading: filter series by packageId for targets that use series + package
  const targetsWithSeriesPackageCascade = ['series_detail', 'lecture']
  const prevPrimaryPkgRef = useRef<string | undefined>(undefined)
  const prevSecondaryPkgRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!targetsWithSeriesPackageCascade.includes(navTargetKey || '')) return
    const currentPkgId = primaryParams['packageId']
    const prevPkgId = prevPrimaryPkgRef.current
    prevPrimaryPkgRef.current = currentPkgId

    if (currentPkgId) {
      const cacheKey = `series:{"package_id":"${currentPkgId}"}`
      fetchedKeysRef.current.delete(cacheKey)
      fetchedKeysRef.current.delete('series')
      loadEntityList('series', { package_id: currentPkgId })

      // Clear series selection when package changes (not on initial load)
      if (prevPkgId && prevPkgId !== currentPkgId && primaryParams['id']) {
        setValue('navigation_params', { ...primaryParams, id: '' })
      }
    }
  }, [primaryParams['packageId'], navTargetKey, loadEntityList])

  useEffect(() => {
    if (!targetsWithSeriesPackageCascade.includes(secondaryNavTargetKey || '')) return
    const currentPkgId = secondaryParams['packageId']
    const prevPkgId = prevSecondaryPkgRef.current
    prevSecondaryPkgRef.current = currentPkgId

    if (currentPkgId) {
      const cacheKey = `series:{"package_id":"${currentPkgId}"}`
      fetchedKeysRef.current.delete(cacheKey)
      fetchedKeysRef.current.delete('series')
      loadEntityList('series', { package_id: currentPkgId })

      // Clear series selection when package changes (not on initial load)
      if (prevPkgId && prevPkgId !== currentPkgId && secondaryParams['id']) {
        setValue('secondary_navigation_params', { ...secondaryParams, id: '' })
      }
    }
  }, [secondaryParams['packageId'], secondaryNavTargetKey, loadEntityList])

  // Auto-populate packageType from the selected package's type
  useEffect(() => {
    if (!navTargetKey || !primaryParams['packageId'] || !entityLists['packages']) return
    const target = navTargets.find(t => t.key === navTargetKey)
    const hasAutoPackageType = target?.params.some(p => p.name === 'packageType' && p.autoFrom === 'packageId')
    if (!hasAutoPackageType) return
    const pkg = entityLists['packages']?.find(p => p._id === primaryParams['packageId'])
    if (pkg?.extra?.packageType && pkg.extra.packageType !== primaryParams['packageType']) {
      setValue('navigation_params', { ...primaryParams, packageType: pkg.extra.packageType })
    }
  }, [primaryParams['packageId'], navTargetKey, entityLists['packages'], navTargets])

  useEffect(() => {
    if (!secondaryNavTargetKey || !secondaryParams['packageId'] || !entityLists['packages']) return
    const target = navTargets.find(t => t.key === secondaryNavTargetKey)
    const hasAutoPackageType = target?.params.some(p => p.name === 'packageType' && p.autoFrom === 'packageId')
    if (!hasAutoPackageType) return
    const pkg = entityLists['packages']?.find(p => p._id === secondaryParams['packageId'])
    if (pkg?.extra?.packageType && pkg.extra.packageType !== secondaryParams['packageType']) {
      setValue('secondary_navigation_params', { ...secondaryParams, packageType: pkg.extra.packageType })
    }
  }, [secondaryParams['packageId'], secondaryNavTargetKey, entityLists['packages'], navTargets])

  // PDF Viewer auto-populate: when documentId changes, fill pdfUrl + title
  useEffect(() => {
    if (navTargetKey === 'pdf_viewer' && primaryParams['documentId']) {
      const doc = entityLists['documents']?.find(d => d._id === primaryParams['documentId'])
      if (doc) {
        const updated = { ...primaryParams }
        if (doc.extra?.file_url) updated['pdfUrl'] = doc.extra.file_url
        updated['title'] = doc.label
        setValue('navigation_params', updated)
      }
    }
  }, [primaryParams['documentId'], navTargetKey, entityLists['documents']])

  useEffect(() => {
    if (secondaryNavTargetKey === 'pdf_viewer' && secondaryParams['documentId']) {
      const doc = entityLists['documents']?.find(d => d._id === secondaryParams['documentId'])
      if (doc) {
        const updated = { ...secondaryParams }
        if (doc.extra?.file_url) updated['pdfUrl'] = doc.extra.file_url
        updated['title'] = doc.label
        setValue('secondary_navigation_params', updated)
      }
    }
  }, [secondaryParams['documentId'], secondaryNavTargetKey, entityLists['documents']])

  // Fetch reference data on open
  useEffect(() => {
    if (open && cardTypes.length === 0) {
      setRefLoading(true)
      Promise.all([
        homeSectionsService.getCardTypes(),
        homeSectionsService.getNavigationTargets(),
      ]).then(([ctRes, ntRes]) => {
        if (ctRes.success && ctRes.data) setCardTypes(ctRes.data.card_types)
        if (ntRes.success && ntRes.data) setNavTargets(ntRes.data.targets)
      }).catch(() => {
        toast.error('Failed to load form options')
      }).finally(() => setRefLoading(false))
    }
  }, [open])

  // Find nav target key from an item's internal_route
  function findNavTargetKey(route: string | null, targets: NavigationTarget[]): string {
    if (!route) return ''
    const target = targets.find(t => t.route === route)
    return target?.key || ''
  }

  // Cleanup on modal open (runs once per open)
  const hasCleanedRef = useRef(false)
  useEffect(() => {
    if (open && !hasCleanedRef.current) {
      hasCleanedRef.current = true
      setImageFile([])
      setIconFile([])
      setUploadProgress(null)
      fetchedKeysRef.current.clear()
      prevPrimaryPkgRef.current = undefined
      prevSecondaryPkgRef.current = undefined
      setExistingImageUrl(null)
      setExistingImageS3Key(null)
      setExistingIconUrl(null)
      setExistingIconS3Key(null)
    }
    if (!open) {
      hasCleanedRef.current = false
    }
  }, [open])

  // Reset form on open — for edit mode, wait until navTargets are loaded
  useEffect(() => {
    if (!open) return

    if (mode === 'edit' && item) {
      // Don't reset until navTargets are loaded — otherwise findNavTargetKey returns ''
      if (navTargets.length === 0) return

      const primaryKey = findNavTargetKey(item.internal_route, navTargets)
      const secondaryKey = findNavTargetKey(item.secondary_internal_route, navTargets)

      reset({
        card_type: item.card_type,
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
        link_type: item.link_type,
        external_url: item.external_url || '',
        navigation_target_key: primaryKey,
        navigation_params: item.internal_params || {},
        secondary_button_text: item.secondary_button_text || '',
        secondary_link_type: item.secondary_link_type,
        secondary_external_url: item.secondary_external_url || '',
        secondary_navigation_target_key: secondaryKey,
        secondary_navigation_params: item.secondary_internal_params || {},
        metadata: item.metadata?.length ? item.metadata.map(m => ({
          label: m.label,
          value: m.value,
          icon_url: m.icon_url || '',
        })) : [],
        display_order: item.display_order,
        is_active: item.is_active,
      })
      setExistingImageUrl(item.image_url)
      setExistingImageS3Key(item.image_s3_key)
      setExistingIconUrl(item.icon_url)
      setExistingIconS3Key(item.icon_s3_key)
    } else {
      reset(defaultValues)
      setExistingImageUrl(null)
      setExistingImageS3Key(null)
      setExistingIconUrl(null)
      setExistingIconS3Key(null)
    }
  }, [open, mode, item, reset, navTargets])

  const handleFormSubmit = async (data: ItemFormValues) => {
    try {
      let imageUrl = existingImageUrl || undefined
      let imageS3Key = existingImageS3Key || undefined
      let iconUrl = existingIconUrl || undefined
      let iconS3Key = existingIconS3Key || undefined

      // Upload main image if new
      if (imageFile.length > 0) {
        setUploadProgress(0)
        try {
          const result = await homeSectionsService.uploadItemImage(sectionId, imageFile[0], setUploadProgress)
          imageUrl = result.imageUrl
          imageS3Key = result.s3Key
        } catch (err: any) {
          toast.error(err.message || 'Failed to upload image')
          setUploadProgress(null)
          return
        }
      }

      // Upload icon if new
      if (iconFile.length > 0) {
        setUploadProgress(0)
        try {
          const result = await homeSectionsService.uploadItemImage(sectionId, iconFile[0], setUploadProgress)
          iconUrl = result.imageUrl
          iconS3Key = result.s3Key
        } catch (err: any) {
          toast.error(err.message || 'Failed to upload icon')
          setUploadProgress(null)
          return
        }
      }
      setUploadProgress(null)

      // Build internal route/params from navigation target
      let internalRoute: string | undefined
      let internalParams: Record<string, string> | undefined
      if (data.link_type === 'internal' && data.navigation_target_key) {
        const target = navTargets.find(t => t.key === data.navigation_target_key)
        if (target) {
          internalRoute = target.route
          internalParams = data.navigation_params && Object.keys(data.navigation_params).length > 0
            ? data.navigation_params : undefined
        }
      }

      let secondaryInternalRoute: string | undefined
      let secondaryInternalParams: Record<string, string> | undefined
      if (data.secondary_link_type === 'internal' && data.secondary_navigation_target_key) {
        const target = navTargets.find(t => t.key === data.secondary_navigation_target_key)
        if (target) {
          secondaryInternalRoute = target.route
          secondaryInternalParams = data.secondary_navigation_params && Object.keys(data.secondary_navigation_params).length > 0
            ? data.secondary_navigation_params : undefined
        }
      }

      const formData: HomeSectionItemFormData = {
        card_type: data.card_type,
        title: data.title || undefined,
        subtitle: data.subtitle || undefined,
        description: data.description || undefined,
        image_url: imageUrl,
        image_s3_key: imageS3Key,
        icon_url: iconUrl,
        icon_s3_key: iconS3Key,
        tag_label: data.tag_label || undefined,
        tag_color: data.tag_color || undefined,
        background_color: data.background_color || undefined,
        text_color: data.text_color || undefined,
        border_color: data.border_color || undefined,
        button_text: data.button_text || undefined,
        button_color: data.button_color || undefined,
        button_text_color: data.button_text_color || undefined,
        link_type: data.link_type,
        external_url: data.link_type === 'external' ? (data.external_url || undefined) : undefined,
        internal_route: internalRoute,
        internal_params: internalParams,
        secondary_button_text: data.secondary_button_text || undefined,
        secondary_link_type: data.secondary_link_type,
        secondary_external_url: data.secondary_link_type === 'external' ? (data.secondary_external_url || undefined) : undefined,
        secondary_internal_route: secondaryInternalRoute,
        secondary_internal_params: secondaryInternalParams,
        metadata: data.metadata?.length ? data.metadata.map(m => ({
          label: m.label,
          value: m.value,
          icon_url: m.icon_url || undefined,
        })) : undefined,
        display_order: typeof data.display_order === 'number' && !isNaN(data.display_order) ? data.display_order : undefined,
        is_active: data.is_active,
      }

      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleClose = () => { if (!isSubmitting && uploadProgress === null) onClose() }
  const isUploading = uploadProgress !== null
  const disabled = isSubmitting || isUploading

  // Image handlers
  const handleImageSelected = (files: File[]) => {
    if (files.length > 0) {
      setImageCropperFile(files[0])
      setShowImageCropper(true)
    }
  }
  const handleImageCropComplete = (croppedFile: File) => {
    setImageFile([croppedFile])
    setShowImageCropper(false)
    setImageCropperFile(null)
  }
  const handleIconSelected = (files: File[]) => {
    if (files.length > 0) {
      setIconCropperFile(files[0])
      setShowIconCropper(true)
    }
  }
  const handleIconCropComplete = (croppedFile: File) => {
    setIconFile([croppedFile])
    setShowIconCropper(false)
    setIconCropperFile(null)
  }

  // Render navigation param fields
  function renderNavParams(
    target: NavigationTarget | undefined,
    prefix: 'navigation_params' | 'secondary_navigation_params',
  ) {
    if (!target || target.params.length === 0) return null
    const params: Record<string, string> = watch(prefix) || {}

    return (
      <div className="space-y-2 pl-4 border-l-2 border-muted">
        <p className="text-xs font-medium text-muted-foreground">Route Parameters</p>
        {target.params.map(param => {
          const entityKey = getEntityListKey(target.key, param.name)
          const isPdfAutoField = target.key === 'pdf_viewer' && (param.name === 'pdfUrl' || param.name === 'title')
          const isAutoFromPackage = param.autoFrom === 'packageId'

          // Filter packages by type if filterPackageType is set (e.g. theory_series only shows Theory packages)
          let dropdownItems = entityKey ? (entityLists[entityKey] || []) : []
          if (entityKey === 'packages' && param.filterPackageType) {
            dropdownItems = dropdownItems.filter(p => p.extra?.packageType === param.filterPackageType)
          }

          return (
            <div key={param.name} className="space-y-1">
              <Label className="text-xs">
                {param.label}
                {param.required && <span className="text-red-500 ml-0.5">*</span>}
                {isAutoFromPackage && <span className="text-muted-foreground ml-1">(auto)</span>}
              </Label>

              {isAutoFromPackage ? (
                // Auto-derived from selected package — read-only
                <Input
                  className="h-8 text-xs bg-muted"
                  placeholder={params['packageId'] ? 'Auto-filled from package' : 'Select a package first'}
                  value={params[param.name] || ''}
                  readOnly
                  disabled={disabled}
                />
              ) : param.type === 'boolean' ? (
                <Select
                  value={params[param.name] || ''}
                  onValueChange={(v) => setValue(prefix, { ...params, [param.name]: v })}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : param.options ? (
                <Select
                  value={params[param.name] || ''}
                  onValueChange={(v) => setValue(prefix, { ...params, [param.name]: v })}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {param.options.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : isPdfAutoField ? (
                // PDF Viewer auto-populated read-only fields
                <Input
                  className="h-8 text-xs bg-muted"
                  placeholder={params['documentId'] ? 'Auto-filled from document' : `Select a document first`}
                  value={params[param.name] || ''}
                  readOnly
                  disabled={disabled}
                />
              ) : entityKey ? (
                // Searchable entity dropdown (with optional type filtering)
                <EntityCombobox
                  items={dropdownItems}
                  loading={entityListsLoading[entityKey] || false}
                  value={params[param.name] || ''}
                  onSelect={(id) => setValue(prefix, { ...params, [param.name]: id })}
                  placeholder={`Select ${param.label}...`}
                  disabled={disabled}
                />
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder={param.label}
                  value={params[param.name] || ''}
                  onChange={(e) => setValue(prefix, { ...params, [param.name]: e.target.value })}
                  disabled={disabled}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Item' : 'Edit Item'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new item in this section.'
              : 'Update the item details.'}
          </DialogDescription>
        </DialogHeader>

        {refLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading form options...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* ─── Card Type ─────────────────────────────────── */}
            <div className="space-y-2">
              <Label>Card Type <span className="text-red-500">*</span></Label>
              <Select
                value={cardType}
                onValueChange={(v) => setValue('card_type', v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a card type..." />
                </SelectTrigger>
                <SelectContent>
                  {cardTypes.map(ct => (
                    <SelectItem key={ct.key} value={ct.key}>{ct.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCardType && (
                <p className="text-xs text-muted-foreground">{selectedCardType.description}</p>
              )}
              {errors.card_type && <p className="text-sm text-red-500">{errors.card_type.message}</p>}
            </div>

            {/* ─── Content ───────────────────────────────────── */}
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="px-2 text-sm font-medium">Content</legend>

              <div className="space-y-2">
                <Label htmlFor="item-title">Title</Label>
                <Input id="item-title" placeholder="Item title" disabled={disabled} {...register('title')} />
                {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-subtitle">Subtitle</Label>
                <Input id="item-subtitle" placeholder="Optional subtitle" disabled={disabled} {...register('subtitle')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-description">Description</Label>
                <Textarea id="item-description" placeholder="Optional description" rows={3} disabled={disabled} {...register('description')} />
              </div>

              {/* Image upload */}
              <div className="space-y-2">
                <Label>Image</Label>
                {imageFile.length > 0 ? (
                  <div className="relative rounded-lg border overflow-hidden">
                    <img src={imagePreviewUrl!} alt="Cropped" className="w-full h-32 object-cover" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => setImageFile([])} disabled={disabled}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : existingImageUrl ? (
                  <div className="relative rounded-lg border overflow-hidden">
                    <img src={existingImageUrl} alt="Current" className="w-full h-32 object-cover" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => { setExistingImageUrl(null); setExistingImageS3Key(null) }} disabled={disabled}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <FileUpload
                    accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }}
                    maxSize={5 * 1024 * 1024}
                    maxFiles={1}
                    value={[]}
                    onChange={handleImageSelected}
                    disabled={disabled}
                    label="Upload image"
                    description="JPEG, PNG, or WebP. Max 5MB. Cropped to 16:9."
                  />
                )}
              </div>

              {/* Icon upload */}
              <div className="space-y-2">
                <Label>Icon</Label>
                {iconFile.length > 0 ? (
                  <div className="relative inline-block rounded-lg border overflow-hidden">
                    <img src={iconPreviewUrl!} alt="Cropped icon" className="h-16 w-16 object-cover" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5"
                      onClick={() => setIconFile([])} disabled={disabled}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : existingIconUrl ? (
                  <div className="relative inline-block rounded-lg border overflow-hidden">
                    <img src={existingIconUrl} alt="Current icon" className="h-16 w-16 object-cover" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5"
                      onClick={() => { setExistingIconUrl(null); setExistingIconS3Key(null) }} disabled={disabled}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <FileUpload
                    accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }}
                    maxSize={2 * 1024 * 1024}
                    maxFiles={1}
                    value={[]}
                    onChange={handleIconSelected}
                    disabled={disabled}
                    label="Upload icon"
                    description="Square icon. Max 2MB. Cropped to 1:1."
                  />
                )}
              </div>

              {/* Tag */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tag_label">Tag Label</Label>
                  <Input id="tag_label" placeholder="e.g. NEW" disabled={disabled} {...register('tag_label')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tag_color">Tag Color</Label>
                  <div className="flex items-center gap-2">
                    <Input id="tag_color" placeholder="#FF5722" disabled={disabled} {...register('tag_color')} />
                    <ColorSwatch color={tagColor} />
                  </div>
                  {errors.tag_color && <p className="text-sm text-red-500">{errors.tag_color.message}</p>}
                </div>
              </div>
            </fieldset>

            {/* ─── Styling ───────────────────────────────────── */}
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="px-2 text-sm font-medium">Styling</legend>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bg_color">Background</Label>
                  <div className="flex items-center gap-2">
                    <Input id="bg_color" placeholder="#FFFFFF" disabled={disabled} {...register('background_color')} />
                    <ColorSwatch color={bgColor} />
                  </div>
                  {errors.background_color && <p className="text-sm text-red-500">{errors.background_color.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="txt_color">Text</Label>
                  <div className="flex items-center gap-2">
                    <Input id="txt_color" placeholder="#000000" disabled={disabled} {...register('text_color')} />
                    <ColorSwatch color={txtColor} />
                  </div>
                  {errors.text_color && <p className="text-sm text-red-500">{errors.text_color.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bdr_color">Border</Label>
                  <div className="flex items-center gap-2">
                    <Input id="bdr_color" placeholder="#E0E0E0" disabled={disabled} {...register('border_color')} />
                    <ColorSwatch color={borderColor} />
                  </div>
                  {errors.border_color && <p className="text-sm text-red-500">{errors.border_color.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="button_text">Button Text</Label>
                <Input id="button_text" placeholder="e.g. Learn More" disabled={disabled} {...register('button_text')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="btn_color">Button Color</Label>
                  <div className="flex items-center gap-2">
                    <Input id="btn_color" placeholder="#1976D2" disabled={disabled} {...register('button_color')} />
                    <ColorSwatch color={btnColor} />
                  </div>
                  {errors.button_color && <p className="text-sm text-red-500">{errors.button_color.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="btn_txt_color">Button Text Color</Label>
                  <div className="flex items-center gap-2">
                    <Input id="btn_txt_color" placeholder="#FFFFFF" disabled={disabled} {...register('button_text_color')} />
                    <ColorSwatch color={btnTxtColor} />
                  </div>
                  {errors.button_text_color && <p className="text-sm text-red-500">{errors.button_text_color.message}</p>}
                </div>
              </div>
            </fieldset>

            {/* ─── Primary Action ─────────────────────────────── */}
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="px-2 text-sm font-medium">Primary Action</legend>

              <div className="space-y-2">
                <Label>Link Type</Label>
                <Select
                  value={linkType}
                  onValueChange={(v) => {
                    setValue('link_type', v as 'none' | 'internal' | 'external')
                    setValue('external_url', '')
                    setValue('navigation_target_key', '')
                    setValue('navigation_params', {})
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="internal">Internal Navigation</SelectItem>
                    <SelectItem value="external">External URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {linkType === 'external' && (
                <div className="space-y-2">
                  <Label htmlFor="external_url">External URL</Label>
                  <Input id="external_url" placeholder="https://..." disabled={disabled} {...register('external_url')} />
                </div>
              )}

              {linkType === 'internal' && (
                <>
                  <div className="space-y-2">
                    <Label>Navigation Target</Label>
                    <Select
                      value={navTargetKey || ''}
                      onValueChange={(v) => {
                        setValue('navigation_target_key', v)
                        setValue('navigation_params', {})
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select screen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {navTargets.map(t => (
                          <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedNavTarget && (
                      <p className="text-xs text-muted-foreground">Route: {selectedNavTarget.route}</p>
                    )}
                  </div>
                  {renderNavParams(selectedNavTarget, 'navigation_params')}
                </>
              )}
            </fieldset>

            {/* ─── Secondary Action ──────────────────────────── */}
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="px-2 text-sm font-medium">Secondary Action</legend>

              <div className="space-y-2">
                <Label htmlFor="secondary_button_text">Button Text</Label>
                <Input id="secondary_button_text" placeholder="e.g. View Details" disabled={disabled} {...register('secondary_button_text')} />
              </div>

              <div className="space-y-2">
                <Label>Link Type</Label>
                <Select
                  value={secondaryLinkType}
                  onValueChange={(v) => {
                    setValue('secondary_link_type', v as 'none' | 'internal' | 'external')
                    setValue('secondary_external_url', '')
                    setValue('secondary_navigation_target_key', '')
                    setValue('secondary_navigation_params', {})
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="internal">Internal Navigation</SelectItem>
                    <SelectItem value="external">External URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {secondaryLinkType === 'external' && (
                <div className="space-y-2">
                  <Label htmlFor="secondary_external_url">External URL</Label>
                  <Input id="secondary_external_url" placeholder="https://..." disabled={disabled} {...register('secondary_external_url')} />
                </div>
              )}

              {secondaryLinkType === 'internal' && (
                <>
                  <div className="space-y-2">
                    <Label>Navigation Target</Label>
                    <Select
                      value={secondaryNavTargetKey || ''}
                      onValueChange={(v) => {
                        setValue('secondary_navigation_target_key', v)
                        setValue('secondary_navigation_params', {})
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select screen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {navTargets.map(t => (
                          <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {secondaryNavTarget && (
                      <p className="text-xs text-muted-foreground">Route: {secondaryNavTarget.route}</p>
                    )}
                  </div>
                  {renderNavParams(secondaryNavTarget, 'secondary_navigation_params')}
                </>
              )}
            </fieldset>

            {/* ─── Metadata ──────────────────────────────────── */}
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="px-2 text-sm font-medium">
                Metadata <span className="text-xs text-muted-foreground font-normal">({metadataFields.length}/10)</span>
              </legend>

              {metadataFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-7 gap-2 items-start">
                  <div className="col-span-2 space-y-1">
                    {index === 0 && <Label className="text-xs">Label</Label>}
                    <Input
                      className="h-8 text-xs"
                      placeholder="Label"
                      disabled={disabled}
                      {...register(`metadata.${index}.label`)}
                    />
                    {errors.metadata?.[index]?.label && (
                      <p className="text-[10px] text-red-500">{errors.metadata[index].label?.message}</p>
                    )}
                  </div>
                  <div className="col-span-2 space-y-1">
                    {index === 0 && <Label className="text-xs">Value</Label>}
                    <Input
                      className="h-8 text-xs"
                      placeholder="Value"
                      disabled={disabled}
                      {...register(`metadata.${index}.value`)}
                    />
                    {errors.metadata?.[index]?.value && (
                      <p className="text-[10px] text-red-500">{errors.metadata[index].value?.message}</p>
                    )}
                  </div>
                  <div className="col-span-2 space-y-1">
                    {index === 0 && <Label className="text-xs">Icon URL</Label>}
                    <Input
                      className="h-8 text-xs"
                      placeholder="Optional icon URL"
                      disabled={disabled}
                      {...register(`metadata.${index}.icon_url`)}
                    />
                  </div>
                  <div className={index === 0 ? 'pt-5' : ''}>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMeta(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {metadataFields.length < 10 && (
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => appendMeta({ label: '', value: '', icon_url: '' })}
                  disabled={disabled}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />Add Entry
                </Button>
              )}
            </fieldset>

            {/* ─── Order & Active ─────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-order">Display Order</Label>
                <Input id="item-order" type="number" min={0} disabled={disabled} {...register('display_order', { valueAsNumber: true })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="item-active" className="text-sm">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    {isActive ? 'Visible' : 'Hidden'}
                  </p>
                </div>
                <Switch
                  id="item-active"
                  checked={isActive}
                  onCheckedChange={(c) => setValue('is_active', c)}
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Upload progress */}
            {uploadProgress !== null && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={disabled}>Cancel</Button>
              <Button type="submit" disabled={disabled}>
                {isSubmitting || isUploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isUploading ? 'Uploading...' : mode === 'create' ? 'Creating...' : 'Updating...'}</>
                ) : (
                  <>{mode === 'create' ? 'Add Item' : 'Update Item'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>

    {/* Image Cropper */}
    <ImageCropper
      file={imageCropperFile}
      open={showImageCropper}
      onClose={() => { setShowImageCropper(false); setImageCropperFile(null) }}
      onCropComplete={handleImageCropComplete}
      aspectRatio={IMAGE_ASPECT_RATIO}
      title="Crop Image"
      description="Adjust the crop area (16:9 ratio)."
    />

    {/* Icon Cropper */}
    <ImageCropper
      file={iconCropperFile}
      open={showIconCropper}
      onClose={() => { setShowIconCropper(false); setIconCropperFile(null) }}
      onCropComplete={handleIconCropComplete}
      aspectRatio={ICON_ASPECT_RATIO}
      title="Crop Icon"
      description="Adjust the crop area (square 1:1 ratio)."
    />
    </>
  )
}
