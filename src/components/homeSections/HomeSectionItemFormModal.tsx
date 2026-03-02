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
  link_type: z.string().optional(),
  navigation_target_key: z.string().optional(),
  navigation_params: z.record(z.string(), z.string()).optional(),
  external_url: z.string().optional().refine(
    val => !val || /^https?:\/\//.test(val), { message: 'Invalid URL' },
  ),
  secondary_button_text: z.string().max(100).optional(),
  secondary_link_type: z.string().optional(),
  secondary_navigation_target_key: z.string().optional(),
  secondary_navigation_params: z.record(z.string(), z.string()).optional(),
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
  link_type: 'none',
  navigation_target_key: '',
  navigation_params: {},
  external_url: '',
  secondary_button_text: '',
  secondary_link_type: 'none',
  secondary_navigation_target_key: '',
  secondary_navigation_params: {},
  secondary_external_url: '',
  metadata: [],
  display_order: 0,
  is_active: true,
}

// ─── Entity types for searchable dropdowns ──────────────────────────────────

interface EntityOption {
  _id: string
  label: string
  extra?: Record<string, string> // for storing additional fields like file_url, package_type
}

/**
 * Resolves which entity list key to use for a given param + navigation target.
 * The param name "id" is ambiguous — its entity type depends on the navigation target.
 */
function getEntityListKey(targetKey: string, paramName: string): string | null {
  // Non-ambiguous param names
  if (paramName === 'packageId') return 'packages'
  if (paramName === 'documentId') return 'documents'

  // "id" depends on target
  if (paramName === 'id') {
    switch (targetKey) {
      case 'series_detail': return 'series'
      case 'lecture': return 'series' // lecture's :id param is a Series ID per backend
      case 'video_player': return 'videos'
      case 'live_session': return 'liveSessions'
      default: return null
    }
  }

  return null
}

// ─── EntityCombobox ─────────────────────────────────────────────────────────

function EntityCombobox({
  items, loading, value, onSelect, placeholder, disabled,
}: {
  items: EntityOption[]
  loading: boolean
  value: string
  onSelect: (id: string) => void
  placeholder: string
  disabled?: boolean
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
                  onSelect={() => { onSelect(item._id); setOpen(false) }}
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

// ─── Helper: find navTarget key from a saved route ──────────────────────────

function findNavTargetKey(route: string | null | undefined, targets: NavigationTarget[]): string {
  if (!route) return ''
  const found = targets.find(t => t.route === route)
  return found ? found.key : ''
}

// ─── Helper: fetch entities from a service ──────────────────────────────────

async function fetchEntityList(
  serviceKey: string,
  filters?: Record<string, string>,
): Promise<EntityOption[]> {
  try {
    let res: any
    switch (serviceKey) {
      case 'packages':
        res = await packagesService.getAll({ limit: 100, ...filters } as any)
        if (res.success && res.data?.entities) {
          return res.data.entities.map((e: any) => ({
            _id: e._id,
            label: e.name || e._id,
            extra: { package_type: e.package_type_id?.name || '' },
          }))
        }
        break
      case 'series':
        res = await seriesService.getAll({ limit: 100, ...filters } as any)
        if (res.success && res.data?.entities) {
          return res.data.entities.map((e: any) => ({
            _id: e._id,
            label: e.name || e._id,
          }))
        }
        break
      case 'videos':
        res = await videosService.getAll({ limit: 100, ...filters } as any)
        if (res.success && res.data?.entities) {
          return res.data.entities.map((e: any) => ({
            _id: e._id,
            label: e.title || e._id,
          }))
        }
        break
      case 'liveSessions':
        res = await liveSessionsService.getAll({ limit: 100, ...filters } as any)
        if (res.success && res.data?.entities) {
          return res.data.entities.map((e: any) => ({
            _id: e._id,
            label: e.title || e._id,
          }))
        }
        break
      case 'documents':
        res = await documentsService.getAll({ limit: 100, ...filters } as any)
        if (res.success && res.data?.entities) {
          return res.data.entities.map((e: any) => ({
            _id: e._id,
            label: e.title || e._id,
            extra: { file_url: e.file_url || '' },
          }))
        }
        break
    }
  } catch (err) {
    console.error(`Failed to fetch ${serviceKey}:`, err)
  }
  return []
}

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
  // ── Reference data (fetched once) ───────────────────────────────────────
  const [navTargets, setNavTargets] = useState<NavigationTarget[]>([])
  const [cardTypes, setCardTypes] = useState<CardTypeInfo[]>([])
  const [refDataReady, setRefDataReady] = useState(false)

  // ── Entity lists for dropdowns ──────────────────────────────────────────
  const [entityLists, setEntityLists] = useState<Record<string, EntityOption[]>>({})
  const [entityLoading, setEntityLoading] = useState<Record<string, boolean>>({})
  const fetchedKeysRef = useRef<Set<string>>(new Set())

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

  // Watched values
  const watchedLinkType = watch('link_type')
  const watchedNavTargetKey = watch('navigation_target_key')
  const watchedNavParams = watch('navigation_params')
  const watchedSecondaryLinkType = watch('secondary_link_type')
  const watchedSecondaryNavTargetKey = watch('secondary_navigation_target_key')
  const watchedSecondaryNavParams = watch('secondary_navigation_params')

  // Resolved targets
  const selectedNavTarget = navTargets.find(t => t.key === watchedNavTargetKey) || null
  const selectedSecondaryNavTarget = navTargets.find(t => t.key === watchedSecondaryNavTargetKey) || null

  // ── Refs for auto-populate tracking ─────────────────────────────────────
  const prevPrimaryPkgRef = useRef<string | undefined>(undefined)
  const prevSecondaryPkgRef = useRef<string | undefined>(undefined)

  // ── 1. Fetch reference data when dialog opens ───────────────────────────

  useEffect(() => {
    if (!open) return
    setRefDataReady(false)

    Promise.all([
      homeSectionsService.getNavigationTargets(),
      homeSectionsService.getCardTypes(),
    ]).then(([navRes, ctRes]) => {
      const targets = navRes.success && navRes.data ? navRes.data.targets : []
      const types = ctRes.success && ctRes.data ? ctRes.data.card_types : []
      setNavTargets(targets)
      setCardTypes(types)
      setRefDataReady(true)
    })
  }, [open])

  // ── 2. Initialize form once reference data is ready ─────────────────────

  useEffect(() => {
    if (!open || !refDataReady) return

    // Clear transient state
    setImageFile([])
    setIconFile([])
    setUploadProgress(null)
    fetchedKeysRef.current.clear()
    prevPrimaryPkgRef.current = undefined
    prevSecondaryPkgRef.current = undefined
    setEntityLists({})
    setEntityLoading({})

    if (mode === 'edit' && item) {
      const primaryKey = findNavTargetKey(item.internal_route, navTargets)
      const secondaryKey = findNavTargetKey(item.secondary_internal_route, navTargets)

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
        link_type: item.link_type || 'none',
        navigation_target_key: primaryKey,
        navigation_params: item.internal_params || {},
        external_url: item.external_url || '',
        secondary_button_text: item.secondary_button_text || '',
        secondary_link_type: item.secondary_link_type || 'none',
        secondary_navigation_target_key: secondaryKey,
        secondary_navigation_params: item.secondary_internal_params || {},
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
    } else {
      reset(DEFAULT_VALUES)
      setExistingImageUrl(null)
      setExistingIconUrl(null)
    }

    setFormReady(true)
  }, [open, refDataReady]) // intentionally only open + refDataReady

  // Clean up on close
  useEffect(() => {
    if (!open) {
      setFormReady(false)
      setRefDataReady(false)
    }
  }, [open])

  // ── 3. Load entity lists when navigation target changes ─────────────────

  const loadEntityList = useCallback(async (
    key: string,
    filters?: Record<string, string>,
  ) => {
    const cacheKey = filters ? `${key}:${JSON.stringify(filters)}` : key
    if (fetchedKeysRef.current.has(cacheKey)) return
    fetchedKeysRef.current.add(cacheKey)

    setEntityLoading(prev => ({ ...prev, [key]: true }))
    const items = await fetchEntityList(key, filters)
    setEntityLists(prev => ({ ...prev, [key]: items }))
    setEntityLoading(prev => ({ ...prev, [key]: false }))
  }, [])

  const loadEntitiesForTarget = useCallback((target: NavigationTarget | null) => {
    if (!target) return
    const neededKeys = new Set<string>()
    for (const param of target.params) {
      if (param.autoFrom || param.options || param.type === 'boolean') continue
      const key = getEntityListKey(target.key, param.name)
      if (key) neededKeys.add(key)
    }
    neededKeys.forEach(key => loadEntityList(key))
  }, [loadEntityList])

  // Load entities when primary nav target changes
  useEffect(() => {
    if (!formReady) return
    loadEntitiesForTarget(selectedNavTarget)
  }, [watchedNavTargetKey, formReady, loadEntitiesForTarget, selectedNavTarget])

  // Load entities when secondary nav target changes
  useEffect(() => {
    if (!formReady) return
    loadEntitiesForTarget(selectedSecondaryNavTarget)
  }, [watchedSecondaryNavTargetKey, formReady, loadEntitiesForTarget, selectedSecondaryNavTarget])

  // ── 4. Cascading: series filtered by packageId ──────────────────────────

  useEffect(() => {
    if (!formReady || !selectedNavTarget) return
    const needsSeries = selectedNavTarget.params.some(
      p => getEntityListKey(selectedNavTarget.key, p.name) === 'series'
    )
    if (!needsSeries) return

    const pkgId = watchedNavParams?.packageId
    if (pkgId) {
      const cacheKey = `series:{"package_id":"${pkgId}"}`
      if (!fetchedKeysRef.current.has(cacheKey)) {
        fetchedKeysRef.current.add(cacheKey)
        setEntityLoading(prev => ({ ...prev, series: true }))
        fetchEntityList('series', { package_id: pkgId }).then(items => {
          setEntityLists(prev => ({ ...prev, series: items }))
          setEntityLoading(prev => ({ ...prev, series: false }))
        })
      }
    }
  }, [watchedNavParams?.packageId, formReady, selectedNavTarget])

  // Same for secondary
  useEffect(() => {
    if (!formReady || !selectedSecondaryNavTarget) return
    const needsSeries = selectedSecondaryNavTarget.params.some(
      p => getEntityListKey(selectedSecondaryNavTarget.key, p.name) === 'series'
    )
    if (!needsSeries) return

    const pkgId = watchedSecondaryNavParams?.packageId
    if (pkgId) {
      const cacheKey = `series:{"package_id":"${pkgId}"}`
      if (!fetchedKeysRef.current.has(cacheKey)) {
        fetchedKeysRef.current.add(cacheKey)
        setEntityLoading(prev => ({ ...prev, series: true }))
        fetchEntityList('series', { package_id: pkgId }).then(items => {
          setEntityLists(prev => ({ ...prev, series: items }))
          setEntityLoading(prev => ({ ...prev, series: false }))
        })
      }
    }
  }, [watchedSecondaryNavParams?.packageId, formReady, selectedSecondaryNavTarget])

  // ── 5. Auto-populate packageType from selected package ──────────────────

  useEffect(() => {
    if (!formReady || !selectedNavTarget) return
    const hasAutoType = selectedNavTarget.params.some(p => p.autoFrom === 'packageId')
    if (!hasAutoType) return

    const pkgId = watchedNavParams?.packageId
    if (!pkgId || pkgId === prevPrimaryPkgRef.current) return

    const pkg = entityLists['packages']?.find(e => e._id === pkgId)
    if (pkg?.extra?.package_type) {
      prevPrimaryPkgRef.current = pkgId
      setValue('navigation_params', {
        ...watchedNavParams,
        packageType: pkg.extra.package_type,
      })
    }
  }, [watchedNavParams?.packageId, entityLists['packages'], formReady, selectedNavTarget])

  // Same for secondary
  useEffect(() => {
    if (!formReady || !selectedSecondaryNavTarget) return
    const hasAutoType = selectedSecondaryNavTarget.params.some(p => p.autoFrom === 'packageId')
    if (!hasAutoType) return

    const pkgId = watchedSecondaryNavParams?.packageId
    if (!pkgId || pkgId === prevSecondaryPkgRef.current) return

    const pkg = entityLists['packages']?.find(e => e._id === pkgId)
    if (pkg?.extra?.package_type) {
      prevSecondaryPkgRef.current = pkgId
      setValue('secondary_navigation_params', {
        ...watchedSecondaryNavParams,
        packageType: pkg.extra.package_type,
      })
    }
  }, [watchedSecondaryNavParams?.packageId, entityLists['packages'], formReady, selectedSecondaryNavTarget])

  // ── 6. PDF Viewer: auto-fill pdfUrl + title from documentId ─────────────

  useEffect(() => {
    if (!formReady) return
    if (watchedNavTargetKey !== 'pdf_viewer') return

    const docId = watchedNavParams?.documentId
    if (!docId) return
    const doc = entityLists['documents']?.find(e => e._id === docId)
    if (doc) {
      setValue('navigation_params', {
        ...watchedNavParams,
        pdfUrl: doc.extra?.file_url || '',
        title: doc.label || '',
      })
    }
  }, [watchedNavParams?.documentId, entityLists['documents'], formReady, watchedNavTargetKey])

  // Same for secondary
  useEffect(() => {
    if (!formReady) return
    if (watchedSecondaryNavTargetKey !== 'pdf_viewer') return

    const docId = watchedSecondaryNavParams?.documentId
    if (!docId) return
    const doc = entityLists['documents']?.find(e => e._id === docId)
    if (doc) {
      setValue('secondary_navigation_params', {
        ...watchedSecondaryNavParams,
        pdfUrl: doc.extra?.file_url || '',
        title: doc.label || '',
      })
    }
  }, [watchedSecondaryNavParams?.documentId, entityLists['documents'], formReady, watchedSecondaryNavTargetKey])

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

      // Build submission data
      const target = navTargets.find(t => t.key === data.navigation_target_key)
      const secondaryTarget = navTargets.find(t => t.key === data.secondary_navigation_target_key)

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
        link_type: data.link_type || 'none',
        external_url: data.link_type === 'external' ? data.external_url || undefined : undefined,
        internal_route: data.link_type === 'internal' && target ? target.route : undefined,
        internal_params: data.link_type === 'internal' && target
          ? data.navigation_params || undefined
          : undefined,
        secondary_button_text: data.secondary_button_text || undefined,
        secondary_link_type: data.secondary_link_type || 'none',
        secondary_external_url: data.secondary_link_type === 'external'
          ? data.secondary_external_url || undefined : undefined,
        secondary_internal_route: data.secondary_link_type === 'internal' && secondaryTarget
          ? secondaryTarget.route : undefined,
        secondary_internal_params: data.secondary_link_type === 'internal' && secondaryTarget
          ? data.secondary_navigation_params || undefined
          : undefined,
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

  // ── Render nav params for a given target ────────────────────────────────

  const renderNavParams = (
    target: NavigationTarget,
    paramsFieldName: 'navigation_params' | 'secondary_navigation_params',
    currentParams: Record<string, string> | undefined,
  ) => {
    return target.params.map(param => {
      const paramValue = currentParams?.[param.name] || ''

      const setParamValue = (val: string) => {
        setValue(paramsFieldName, { ...currentParams, [param.name]: val })
      }

      // Auto-derived param (e.g., packageType from packageId) — show read-only
      if (param.autoFrom) {
        return (
          <div key={param.name} className="space-y-1">
            <Label className="text-xs">{param.label} <span className="text-muted-foreground">(auto)</span></Label>
            <Input
              className="h-8 text-xs bg-muted"
              value={paramValue}
              readOnly
              placeholder="Auto-derived..."
            />
          </div>
        )
      }

      // Boolean param
      if (param.type === 'boolean') {
        return (
          <div key={param.name} className="space-y-1">
            <Label className="text-xs">{param.label}{param.required && ' *'}</Label>
            <Select value={paramValue} onValueChange={setParamValue}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )
      }

      // Enum options param (e.g., packageType with predefined options)
      if (param.options && param.options.length > 0) {
        return (
          <div key={param.name} className="space-y-1">
            <Label className="text-xs">{param.label}{param.required && ' *'}</Label>
            <Select value={paramValue} onValueChange={setParamValue}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {param.options.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      }

      // Entity dropdown param (packageId, documentId, id, etc.)
      const entityKey = getEntityListKey(target.key, param.name)
      if (entityKey) {
        let items = entityLists[entityKey] || []
        const loading = entityLoading[entityKey] || false

        // Client-side filter: for theory_series/practical_series, only show matching package type
        if (entityKey === 'packages' && param.filterPackageType) {
          items = items.filter(i => i.extra?.package_type === param.filterPackageType)
        }

        // PDF viewer: pdfUrl and title are auto-filled from document
        const isPdfAuto = target.key === 'pdf_viewer' && (param.name === 'pdfUrl' || param.name === 'title')
        if (isPdfAuto) {
          return (
            <div key={param.name} className="space-y-1">
              <Label className="text-xs">{param.label} <span className="text-muted-foreground">(auto)</span></Label>
              <Input
                className="h-8 text-xs bg-muted"
                value={paramValue}
                readOnly
                placeholder="Auto-filled from document..."
              />
            </div>
          )
        }

        return (
          <div key={param.name} className="space-y-1">
            <Label className="text-xs">{param.label}{param.required && ' *'}</Label>
            <EntityCombobox
              items={items}
              loading={loading}
              value={paramValue}
              onSelect={setParamValue}
              placeholder={`Select ${param.label.toLowerCase()}...`}
            />
          </div>
        )
      }

      // Fallback: plain text input for pdfUrl, title (pdf_viewer), etc.
      const isPdfAutoFill = target.key === 'pdf_viewer' && (param.name === 'pdfUrl' || param.name === 'title')
      return (
        <div key={param.name} className="space-y-1">
          <Label className="text-xs">
            {param.label}{param.required && ' *'}
            {isPdfAutoFill && <span className="text-muted-foreground"> (auto)</span>}
          </Label>
          <Input
            className={cn("h-8 text-xs", isPdfAutoFill && "bg-muted")}
            value={paramValue}
            onChange={e => setParamValue(e.target.value)}
            readOnly={isPdfAutoFill}
            placeholder={isPdfAutoFill ? 'Auto-filled from document...' : `Enter ${param.label.toLowerCase()}...`}
          />
        </div>
      )
    })
  }

  // ── Render a link type section (primary or secondary) ───────────────────

  const renderLinkSection = (
    prefix: '' | 'secondary_',
    linkType: string | undefined,
    navTargetKey: string | undefined,
    navParams: Record<string, string> | undefined,
    target: NavigationTarget | null,
  ) => {
    const linkTypeField = `${prefix}link_type` as const
    const navKeyField = `${prefix}navigation_target_key` as const
    const navParamsField = `${prefix}navigation_params` as const
    const externalUrlField = `${prefix}external_url` as const
    const buttonTextField = `${prefix}button_text` as const

    return (
      <div className="space-y-3">
        {/* Button Text */}
        <div className="space-y-1">
          <Label className="text-xs">{prefix === 'secondary_' ? 'Secondary ' : ''}Button Text</Label>
          <Input className="h-8 text-xs" {...register(buttonTextField as any)} placeholder="e.g. View Details" />
        </div>

        {/* Link Type */}
        <div className="space-y-1">
          <Label className="text-xs">{prefix === 'secondary_' ? 'Secondary ' : ''}Link Type</Label>
          <Select
            value={linkType || 'none'}
            onValueChange={(val) => {
              setValue(linkTypeField as any, val)
              if (val !== 'internal') {
                setValue(navKeyField as any, '')
                setValue(navParamsField as any, {})
              }
              if (val !== 'external') {
                setValue(externalUrlField as any, '')
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="internal">Internal Navigation</SelectItem>
              <SelectItem value="external">External URL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* External URL */}
        {linkType === 'external' && (
          <div className="space-y-1">
            <Label className="text-xs">External URL *</Label>
            <Input className="h-8 text-xs" {...register(externalUrlField as any)} placeholder="https://..." />
            {(errors as any)?.[externalUrlField] && (
              <p className="text-xs text-destructive">{(errors as any)[externalUrlField]?.message}</p>
            )}
          </div>
        )}

        {/* Internal Navigation */}
        {linkType === 'internal' && (
          <div className="space-y-3">
            {/* Navigation Target Selector */}
            <div className="space-y-1">
              <Label className="text-xs">Navigation Target *</Label>
              <Select
                value={navTargetKey || ''}
                onValueChange={(val) => {
                  setValue(navKeyField as any, val)
                  setValue(navParamsField as any, {})
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select screen..." />
                </SelectTrigger>
                <SelectContent>
                  {navTargets.map(t => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Route Params */}
            {target && target.params.length > 0 && (
              <div className="space-y-2 pl-3 border-l-2 border-muted">
                <Label className="text-xs text-muted-foreground">Route Parameters</Label>
                {renderNavParams(target, navParamsField as any, navParams)}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                {renderLinkSection(
                  '',
                  watchedLinkType,
                  watchedNavTargetKey,
                  watchedNavParams,
                  selectedNavTarget,
                )}
              </div>

              {/* ── Secondary Action ── */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Secondary Action</h4>
                {renderLinkSection(
                  'secondary_',
                  watchedSecondaryLinkType,
                  watchedSecondaryNavTargetKey,
                  watchedSecondaryNavParams,
                  selectedSecondaryNavTarget,
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
