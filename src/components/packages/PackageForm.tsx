import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Film, ImageIcon, Plus, Trash2 } from 'lucide-react'
import { Section, StatusPill } from '@/components/common/detail'
import { FileUpload } from '@/components/common/FileUpload'
import { ImageUploadWithCrop } from '@/components/common/ImageUploadWithCrop'
import RichTextEditor from '@/components/common/RichTextEditor'
import { istToday } from '@/components/common/DateRangeFilter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDock, EditorBar, Field, Notice, ProgressBar, SearchSelect } from '@/components/users/kit'
import { errText, focusFirstError, unwrap, useEditorGuard, useResource } from '@/components/users/lib'
import { formatDuration, formatINR, subscriptionLabel } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'
import { packagesService, type Package, type PackageDetail } from '@/services/packages.service'
import { subjectsService, type Subject } from '@/services/subjects.service'
import { packageTypesService, type PackageType } from '@/services/packageTypes.service'
import { couponsService, type Coupon } from '@/services/coupons.service'
import { packageSalesService } from './packageSales'
import { BundlePicker } from './BundlePicker'
import { EMPTY_PACKAGE, packageSchema, toFormValues, toPayload, type PackageFormValues } from './packageFormModel'

interface PackageFormProps {
  mode: 'create' | 'edit'
  pkg: PackageDetail | null
  defaultSubjectId?: string
  /** Reload after "Load the latest" in a conflict. */
  onReload?: () => void
}

type MediaKey = 'trailer' | 'thumbnail' | 'video_lectures' | 'notes'
const MEDIA_LABEL: Record<MediaKey, string> = { trailer: 'Trailer Video', thumbnail: 'Package Thumbnail', video_lectures: 'Video Lectures Thumbnail', notes: 'Notes Thumbnail' }

export function PackageForm({ mode, pkg, defaultSubjectId, onReload }: PackageFormProps) {
  const { hasPermission } = useAuth()
  const formRef = useRef<HTMLFormElement>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const baseline = useRef(pkg?.updatedAt ?? null)

  // ── Media: files chosen now, and what is saved on the server ──
  const [files, setFiles] = useState<Partial<Record<MediaKey, File | null>>>({})
  const [saved, setSaved] = useState<Record<MediaKey, string | null>>({
    trailer: pkg?.trailer_video_url ?? null, thumbnail: pkg?.thumbnail_url ?? null,
    video_lectures: pkg?.video_lectures_thumbnail_url ?? null, notes: pkg?.notes_thumbnail_url ?? null,
  })
  const [replacingTrailer, setReplacingTrailer] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState<MediaKey | null>(null)
  const [deleteMedia, setDeleteMedia] = useState<MediaKey | null>(null)
  const pendingFiles = (Object.keys(files) as MediaKey[]).filter((k) => files[k])

  const {
    register, handleSubmit, control, reset, setValue, watch, formState: { errors, isSubmitting, isDirty },
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: pkg ? toFormValues(pkg) : { ...EMPTY_PACKAGE, subject_id: defaultSubjectId || '' },
    shouldFocusError: false,
  })
  const { fields: tierFields, append, remove } = useFieldArray({ control, name: 'tiers', keyName: 'key' })
  const leave = useEditorGuard((isDirty || pendingFiles.length > 0) && !isSubmitting)

  const v = watch()
  const hasTiers = v.tiers.length > 0

  // ── Lists ──
  const subjects = useResource<Subject[]>(async () => unwrap(await subjectsService.getSubjects({ limit: 100, sort_by: 'name', sort_order: 'asc' })).entities, [])
  const types = useResource<PackageType[]>(async () => unwrap(await packageTypesService.getAllPublic()), [])
  const catalogue = useResource<Package[]>(async () => unwrap(await packagesService.getAll({ limit: 200, sort_by: 'name', sort_order: 'asc', with_counts: true })).entities, [])
  // Everyone except this package and any package that is already a combo (the API refuses nested combos)
  const bundlable = useMemo(() => (catalogue.data || []).filter((p) => p._id !== pkg?._id && (p.bundled_package_ids || []).length === 0), [catalogue.data, pkg?._id])

  // ── What depends on each length ──
  const canSeeSales = hasPermission('analytics.read')
  const canSeeCoupons = hasPermission('coupons.read')
  const sales = useResource<Map<number, number> | null>(async () => (pkg && canSeeSales ? packageSalesService.soldByDays(pkg._id) : null), [pkg?._id])
  const coupons = useResource<Coupon[] | null>(async () => (pkg && canSeeCoupons ? unwrap(await couponsService.getAll({ limit: 500 })).entities : null), [pkg?._id])
  const couponsFor = (tierId?: string) => (!tierId || !pkg ? [] : (coupons.data || []).filter((c) => c.applies_to === 'products' && (c.applicable_products || []).some((p) => p.product_type === 'package' && String(p.product_id) === pkg._id && (p.tier_ids || []).map(String).includes(tierId))))
  const savedTiers = pkg?.tiers || []
  const [removeTier, setRemoveTier] = useState<number | null>(null)

  const askRemove = (index: number) => {
    const tier = v.tiers[index]
    const original = tier?._id ? savedTiers.find((t) => String(t._id) === tier._id) : undefined
    if (!original) { remove(index); return }
    setRemoveTier(index)
  }

  const addTier = () => {
    const used = new Set(v.tiers.map((t) => t.duration_days))
    const days = [180, 365, 90, 30].find((d) => !used.has(d)) ?? 730
    append({ name: formatDuration(days).replace(/\bmonth/, 'Month'), duration_days: days, price: hasTiers ? Number.NaN : v.price || Number.NaN, original_price: Number.NaN, display_order: tierFields.length }, { shouldFocus: false })
  }

  // ── Save ──
  const upload = async (packageId: string): Promise<{ key: MediaKey; reason: string }[]> => {
    const failed: { key: MediaKey; reason: string }[] = []
    for (const key of pendingFiles) {
      const file = files[key]!
      setUploading(key)
      try {
        if (key === 'trailer') {
          setUploadProgress(0)
          await packagesService.uploadTrailer(packageId, file, setUploadProgress)
        } else if (key === 'thumbnail') await packagesService.uploadThumbnail(packageId, file)
        else await packagesService.uploadSectionThumbnail(packageId, file, key)
        setFiles((prev) => ({ ...prev, [key]: null }))
      } catch (err) {
        failed.push({ key, reason: errText(err, 'The upload did not finish.') })
      } finally {
        setUploadProgress(null)
        setUploading(null)
      }
    }
    return failed
  }

  const save = async (data: PackageFormValues, force = false) => {
    setSubmitError(null)
    setConflict(null)
    const payload = toPayload(data, mode, pkg)
    try {
      if (mode === 'create') {
        const created = unwrap(await packagesService.create(payload), 'Failed to create package')
        const failed = pendingFiles.length ? await upload(created._id) : []
        if (failed.length) {
          toast.error(`Package created, but ${failed.map((f) => MEDIA_LABEL[f.key].toLowerCase()).join(', ')} could not be uploaded: ${failed[0].reason} Add it again here.`, { duration: 12000 })
          leave(`/content/packages/${created._id}/edit`, { replace: true })
          return
        }
        toast.success('Package created successfully')
        leave(`/content/packages/${created._id}`, { replace: true })
        return
      }

      const id = pkg!._id
      if (!force) {
        const latest = unwrap(await packagesService.getById(id), 'The package could not be checked before saving.')
        if (baseline.current && latest.updatedAt && latest.updatedAt !== baseline.current) {
          setConflict('Someone else changed this package after you opened it.')
          return
        }
      }
      const updated = unwrap(await packagesService.update(id, payload), 'Failed to update package')
      baseline.current = updated.updatedAt ?? baseline.current
      const failed = pendingFiles.length ? await upload(id) : []
      if (failed.length) {
        // The fields are saved; only the files are left to retry
        reset(data)
        const now = await packagesService.getById(id).catch(() => null)
        if (now?.data?.updatedAt) baseline.current = now.data.updatedAt
        setSubmitError(`Saved, but ${failed.map((f) => MEDIA_LABEL[f.key].toLowerCase()).join(', ')} could not be uploaded: ${failed[0].reason}`)
        return
      }
      toast.success('Package updated successfully')
      leave(`/content/packages/${id}`)
    } catch (err) {
      setSubmitError(errText(err, mode === 'create' ? 'Failed to create package' : 'Failed to update package'))
    }
  }

  const removeMedia = async (key: MediaKey) => {
    if (!pkg) return
    const res = key === 'trailer' ? await packagesService.deleteTrailer(pkg._id)
      : key === 'thumbnail' ? await packagesService.deleteThumbnail(pkg._id)
        : await packagesService.deleteSectionThumbnail(pkg._id, key)
    const next = unwrap(res, 'The file was not deleted.')
    if (next.updatedAt) baseline.current = next.updatedAt
    setSaved((prev) => ({ ...prev, [key]: null }))
    toast.success(key === 'trailer' ? 'Trailer deleted' : 'Thumbnail deleted')
  }

  useEffect(() => { if (!v.is_on_sale) return; if (hasTiers) setValue('sale_price', Number.NaN); else setValue('sale_discount_percent', Number.NaN) }, [hasTiers]) // eslint-disable-line react-hooks/exhaustive-deps

  const busy = isSubmitting
  const cancelHref = pkg ? `/content/packages/${pkg._id}` : '/content/packages'
  const pct = v.is_on_sale && Number.isFinite(v.sale_discount_percent) ? Number(v.sale_discount_percent) : 0
  const removing = removeTier !== null ? v.tiers[removeTier] : null
  const removingSaved = removing?._id ? savedTiers.find((t) => String(t._id) === removing._id) : undefined
  const removingSold = removingSaved && sales.data ? sales.data.get(removingSaved.duration_days) ?? 0 : undefined
  const removingCoupons = couponsFor(removing?._id)

  return (
    <form ref={formRef} noValidate className="relative" onSubmit={handleSubmit((d) => save(d), () => { setSubmitError('Some fields need attention. They are marked above.'); focusFirstError(formRef.current) })}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {conflict && (
            <Notice tone="warning" title={conflict}>
              <p>Load the latest version to see their change, or save yours over it.</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {onReload && <Button type="button" size="sm" variant="outline" className="bg-card text-foreground" onClick={onReload}>Load the latest</Button>}
                <Button type="button" size="sm" onClick={handleSubmit((d) => save(d, true))} disabled={busy}>Save mine anyway</Button>
              </div>
            </Notice>
          )}

          <Section title="Basic Info">
            <div className="space-y-5">
              <Field id="name" label="Name" required error={errors.name?.message} aside={`${(v.name || '').length}/200`}>
                <Input placeholder="e.g., Anatomy Complete Course" autoComplete="off" disabled={busy} {...register('name')} />
              </Field>
              <Field id="description" label="Short Description" required error={errors.description?.message} aside={`${(v.description || '').length}/2000`}>
                <Textarea placeholder="Brief plain-text description (used as fallback for older app versions)..." rows={2} disabled={busy} {...register('description')} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="subject_id" label="Subject" required error={errors.subject_id?.message}>
                  <SearchSelect
                    value={v.subject_id} onChange={(id) => setValue('subject_id', id, { shouldDirty: true, shouldValidate: true })}
                    options={(subjects.data || []).map((s) => ({ value: s._id, label: s.name }))}
                    loading={subjects.loading} error={subjects.error} onRetry={() => subjects.reload()} placeholder="Select subject" searchPlaceholder="Search subjects..." emptyText="No subjects found."
                    missingLabel={pkg && typeof pkg.subject_id === 'object' && pkg.subject_id ? pkg.subject_id.name : 'Deleted subject'}
                    disabled={busy || (mode === 'create' && !!defaultSubjectId)}
                  />
                </Field>
                <Field id="package_type_id" label="Package Type" required error={errors.package_type_id?.message}>
                  <SearchSelect
                    value={v.package_type_id} onChange={(id) => setValue('package_type_id', id, { shouldDirty: true, shouldValidate: true })}
                    options={(types.data || []).map((t) => ({ value: t._id, label: t.name, hint: t.description || undefined }))}
                    loading={types.loading} error={types.error} onRetry={() => types.reload()} placeholder="Select type" searchPlaceholder="Search types..." emptyText="No types found."
                    missingLabel="Deleted type" disabled={busy}
                  />
                </Field>
              </div>

              <div>
                <p id="bundle-label" className="mb-1.5 text-[13px] font-medium">Bundles These Packages (Combo)</p>
                <Controller name="bundled_package_ids" control={control} render={({ field }) => (
                  <BundlePicker
                    value={field.value} onChange={field.onChange} packages={bundlable} loading={catalogue.loading} error={catalogue.error} onRetry={() => catalogue.reload()} disabled={busy}
                    knownNames={Object.fromEntries((pkg?.bundled_package_ids || []).filter((b) => b && typeof b === 'object').map((b) => [b._id, b.name]))}
                  />
                )} />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Optional. If set, purchasing this package also grants access to every package selected here, e.g. a "Theory + Practical" combo bundling the standalone Theory and Practical packages.
                </p>
              </div>

              <Field id="rich_description" label="Package Description (Rich Text)" error={errors.rich_description?.message} hint="Use headings, lists, and formatting to describe the package. This replaces the old tick-mark feature list in new app versions.">
                <div>
                  <Controller name="rich_description" control={control} render={({ field }) => (
                    <RichTextEditor value={field.value || ''} onChange={field.onChange} disabled={busy} placeholder="Add headings, bullet points, and formatted content describing what's included..." />
                  )} />
                </div>
              </Field>
              <Field id="features" label="Features (for older app versions)" error={errors.features?.message} aside={`${(v.features || '').length}/2000`} hint="Plain text fallback, shown as a tick-mark list on older app versions. Auto-filled from rich text bullet points if left empty.">
                <Textarea placeholder="One feature per line..." rows={3} disabled={busy} {...register('features')} />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="display_order" label="Display Order" error={errors.display_order?.message} hint={mode === 'create' ? 'Leave empty to add it last in its subject.' : undefined}>
                  <Input type="number" inputMode="numeric" min={0} disabled={busy} className="tabular-nums" {...register('display_order', { valueAsNumber: true })} />
                </Field>
                <div className="flex items-center justify-between gap-4 self-start rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <Label htmlFor="is_active" className="text-sm">Active</Label>
                    <p className="text-xs text-muted-foreground">{v.is_active ? 'Visible to users' : 'Hidden from users'}</p>
                  </div>
                  <Switch id="is_active" checked={v.is_active} onCheckedChange={(c) => setValue('is_active', c, { shouldDirty: true })} disabled={busy} />
                </div>
              </div>
              <Field id="publish_status" label="Publish Status" hint="Draft content is only visible to admins. Publish when ready for users." className="sm:max-w-[320px]">
                <StatusSelect value={v.publish_status} onChange={(s) => setValue('publish_status', s, { shouldDirty: true })} disabled={busy} />
              </Field>
            </div>
          </Section>

          <Section title="Pricing">
            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-3">
                <Field id="price" label="Base Price (INR)" required error={errors.price?.message}>
                  <Input type="number" inputMode="decimal" min={0} disabled={busy} className="tabular-nums" {...register('price', { valueAsNumber: true })} />
                </Field>
                <Field id="original_price" label="Original Price" error={errors.original_price?.message}>
                  <Input type="number" inputMode="decimal" min={0} placeholder="MRP" disabled={busy} className="tabular-nums" {...register('original_price', { valueAsNumber: true })} />
                </Field>
                <Field id="duration_days" label="Duration (days)" required error={errors.duration_days?.message} hint={Number.isFinite(v.duration_days) ? formatDuration(v.duration_days) : undefined}>
                  <Input type="number" inputMode="numeric" min={1} disabled={busy} className="tabular-nums" {...register('duration_days', { valueAsNumber: true })} />
                </Field>
              </div>
              {hasTiers && <p className="text-xs text-muted-foreground">Base price and duration are used as fallback when tiers are empty. Each tier defines its own price and duration.</p>}

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Pricing Tiers</h3>
                    <p className="text-xs text-muted-foreground">{hasTiers ? `${v.tiers.length} tier${v.tiers.length > 1 ? 's' : ''} configured. Each length is its own subscription.` : 'No tiers. Single price/duration package.'}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="bg-card" onClick={addTier} disabled={busy || v.tiers.length >= 10}><Plus aria-hidden="true" />Add Tier</Button>
                </div>
                {typeof errors.tiers?.message === 'string' && <p role="alert" className="text-xs text-danger">{errors.tiers.message}</p>}
                {tierFields.map((field, index) => {
                  const tier = v.tiers[index]
                  if (!tier) return null
                  const original = tier._id ? savedTiers.find((t) => String(t._id) === tier._id) : undefined
                  const zoho = (original as (typeof original & { zoho_item_id?: string | null }) | undefined)?.zoho_item_id
                  const sold = original && sales.data ? sales.data.get(original.duration_days) ?? 0 : undefined
                  const targeting = couponsFor(tier._id)
                  const e = errors.tiers?.[index]
                  return (
                    <div key={field.key} className="rounded-lg border border-border bg-card">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border bg-muted/40 px-4 py-2.5">
                        <h4 className="min-w-0 break-words text-sm font-semibold">{Number.isFinite(tier.duration_days) && tier.duration_days > 0 ? `${formatDuration(tier.duration_days)} subscription` : `Tier ${index + 1}`}</h4>
                        <StatusPill tone={zoho ? 'success' : 'warning'}>{zoho ? 'Zoho item linked' : 'Zoho item not created yet'}</StatusPill>
                        <span className="text-xs text-muted-foreground">
                          {[sold !== undefined ? `${sold.toLocaleString('en-IN')} sold` : null, targeting.length ? `${targeting.length} coupon${targeting.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
                        </span>
                        <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs text-danger hover:bg-danger-soft hover:text-danger" onClick={() => askRemove(index)} disabled={busy} aria-label={`Remove tier ${index + 1}`}>
                          <Trash2 aria-hidden="true" className="!size-3.5" />Remove
                        </Button>
                      </div>
                      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
                        <Field id={`tier-${index}-name`} label="Name" required error={e?.name?.message}>
                          <Input placeholder="e.g., 3 Months" autoComplete="off" disabled={busy} {...register(`tiers.${index}.name`)} />
                        </Field>
                        <Field id={`tier-${index}-days`} label="Duration (days)" required error={e?.duration_days?.message} hint={Number.isFinite(tier.duration_days) ? formatDuration(tier.duration_days) : undefined}>
                          <Input type="number" inputMode="numeric" min={1} disabled={busy} className="tabular-nums" {...register(`tiers.${index}.duration_days`, { valueAsNumber: true })} />
                        </Field>
                        <Field id={`tier-${index}-price`} label="Price (INR)" required error={e?.price?.message} hint={pct > 0 && Number.isFinite(tier.price) ? `Sale: ${formatINR(Math.round(tier.price * (1 - pct / 100)))}` : undefined}>
                          <Input type="number" inputMode="decimal" min={0} disabled={busy} className="tabular-nums" {...register(`tiers.${index}.price`, { valueAsNumber: true })} />
                        </Field>
                        <Field id={`tier-${index}-compare`} label="Compare At" error={e?.original_price?.message}>
                          <Input type="number" inputMode="decimal" min={0} placeholder="MRP" disabled={busy} className="tabular-nums" {...register(`tiers.${index}.original_price`, { valueAsNumber: true })} />
                        </Field>
                        <Field id={`tier-${index}-order`} label="Order" error={e?.display_order?.message}>
                          <Input type="number" inputMode="numeric" min={0} disabled={busy} className="tabular-nums" {...register(`tiers.${index}.display_order`, { valueAsNumber: true })} />
                        </Field>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <Label htmlFor="is_on_sale" className="text-sm font-medium">On Sale</Label>
                    <p className="text-xs text-muted-foreground">{v.is_on_sale ? 'Package is on sale' : 'No sale pricing applied'}</p>
                  </div>
                  <Switch
                    id="is_on_sale" checked={v.is_on_sale} disabled={busy}
                    onCheckedChange={(checked) => {
                      setValue('is_on_sale', checked, { shouldDirty: true })
                      if (!checked) { setValue('sale_price', Number.NaN); setValue('sale_discount_percent', Number.NaN); setValue('sale_end_date', '') }
                    }}
                  />
                </div>
                {v.is_on_sale && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {hasTiers ? (
                      <Field id="sale_discount_percent" label="Discount %" required error={errors.sale_discount_percent?.message} hint="Applied uniformly to all tier prices">
                        <Input type="number" inputMode="decimal" min={0} max={100} step={0.1} placeholder="e.g., 20" disabled={busy} className="tabular-nums" {...register('sale_discount_percent', { valueAsNumber: true })} />
                      </Field>
                    ) : (
                      <Field id="sale_price" label="Sale Price (INR)" required error={errors.sale_price?.message}>
                        <Input type="number" inputMode="decimal" min={0} disabled={busy} className="tabular-nums" {...register('sale_price', { valueAsNumber: true })} />
                      </Field>
                    )}
                    <Field id="sale_end_date" label="Sale End Date" error={errors.sale_end_date?.message} hint="The sale runs until the end of this day, IST. Leave empty for no end.">
                      <Input type="date" min={istToday()} disabled={busy} {...register('sale_end_date')} />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section title="Media" description={mode === 'create' ? 'Uploaded right after the package is created.' : 'New files are uploaded when you save.'}>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <MediaTitle icon={Film}>Trailer Video</MediaTitle>
                {saved.trailer && !replacingTrailer ? (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <StatusPill tone="success">Uploaded</StatusPill>
                      <a href={saved.trailer} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-primary hover:underline hover:underline-offset-4">Watch the trailer</a>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="bg-card" onClick={() => setReplacingTrailer(true)} disabled={busy}>Replace</Button>
                      <Button type="button" variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setDeleteMedia('trailer')} disabled={busy}><Trash2 aria-hidden="true" />Delete</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileUpload
                      accept={{ 'video/*': ['.mp4', '.mov', '.avi', '.webm'] }} maxSize={500 * 1024 * 1024} maxFiles={1}
                      value={files.trailer ? [files.trailer] : []} onChange={(list) => setFiles((p) => ({ ...p, trailer: list[0] || null }))}
                      label="Upload trailer" description="Max 500MB." disabled={busy}
                    />
                    {saved.trailer && replacingTrailer && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setReplacingTrailer(false); setFiles((p) => ({ ...p, trailer: null })) }}>Keep the current trailer</Button>}
                  </div>
                )}
                {uploadProgress !== null && <ProgressBar value={uploadProgress} label="Uploading trailer" />}
              </div>
              <ImageSlot label="Package Thumbnail" note="16:9 ratio. Max 5MB." file={files.thumbnail} url={saved.thumbnail} onFile={(f) => setFiles((p) => ({ ...p, thumbnail: f }))} onDelete={() => setDeleteMedia('thumbnail')} disabled={busy} />
              <ImageSlot label="Video Lectures Thumbnail" note="16:9 ratio. Max 5MB." file={files.video_lectures} url={saved.video_lectures} onFile={(f) => setFiles((p) => ({ ...p, video_lectures: f }))} onDelete={() => setDeleteMedia('video_lectures')} disabled={busy} />
              <ImageSlot label="Notes Thumbnail" note="16:9 ratio. Max 5MB." file={files.notes} url={saved.notes} onFile={(f) => setFiles((p) => ({ ...p, notes: f }))} onDelete={() => setDeleteMedia('notes')} disabled={busy} />
            </div>
          </Section>
        </div>

        <aside aria-label="What students can buy" className="xl:sticky xl:top-0 xl:self-start">
          <Section title="What students can buy" description="One line per subscription length.">
            <SellableList values={v} pct={pct} />
            <div className="mt-4 border-t border-border pt-3">
              <StatusPill tone={v.publish_status !== 'published' ? 'neutral' : v.is_active ? 'success' : 'warning'}>
                {v.publish_status !== 'published' ? 'Draft, not shown to students' : v.is_active ? 'Shown to students' : 'Published but inactive'}
              </StatusPill>
            </div>
          </Section>
        </aside>
      </div>

      <EditorBar
        cancelHref={cancelHref}
        submitLabel={mode === 'create' ? 'Create Package' : 'Update Package'}
        savingLabel={uploading ? `Uploading ${MEDIA_LABEL[uploading].toLowerCase()}…` : mode === 'create' ? 'Creating…' : 'Updating…'}
        saving={isSubmitting} error={submitError}
        note={pendingFiles.length > 0 ? `${pendingFiles.length} file${pendingFiles.length === 1 ? '' : 's'} will be uploaded on save.` : undefined}
      />

      <ConfirmDock
        open={removeTier !== null} onClose={() => setRemoveTier(null)}
        title={`Remove the ${removing ? formatDuration(removingSaved?.duration_days ?? removing.duration_days) : ''} subscription?`}
        description={(
          <div className="space-y-1.5">
            <p>{removingSold ? `${removingSold.toLocaleString('en-IN')} student${removingSold === 1 ? ' has' : 's have'} bought this length. Their access stays; new students cannot buy it.` : removingSold === 0 ? 'Nobody has bought this length yet.' : 'Students who bought this length keep their access; new students cannot buy it.'}</p>
            {removingCoupons.length > 0 && <p className="text-warning">{removingCoupons.length === 1 ? 'Coupon' : 'Coupons'} {removingCoupons.slice(0, 5).map((c) => c.code).join(', ')}{removingCoupons.length > 5 ? ` and ${removingCoupons.length - 5} more` : ''} {removingCoupons.length === 1 ? 'targets' : 'target'} it. Update {removingCoupons.length === 1 ? 'that coupon' : 'those coupons'} too.</p>}
            <p>It is removed when you save the package.</p>
          </div>
        )}
        confirmLabel="Remove tier" workingLabel="Removing…"
        onConfirm={() => { if (removeTier !== null) remove(removeTier) }}
      />
      <ConfirmDock
        open={deleteMedia !== null} onClose={() => setDeleteMedia(null)}
        title={deleteMedia === 'trailer' ? 'Delete the trailer video?' : deleteMedia === 'thumbnail' ? 'Delete the thumbnail image?' : deleteMedia === 'video_lectures' ? 'Delete video lectures thumbnail?' : 'Delete notes thumbnail?'}
        description="It is deleted now, without saving the rest of the form."
        confirmLabel="Delete" workingLabel="Deleting…" onConfirm={() => removeMedia(deleteMedia!)}
      />
    </form>
  )
}

function StatusSelect({ value, onChange, disabled, ...aria }: { value: 'draft' | 'published'; onChange: (v: 'draft' | 'published') => void; disabled?: boolean; id?: string }) {
  return (
    <Select value={value} onValueChange={(s) => onChange(s as 'draft' | 'published')} disabled={disabled}>
      <SelectTrigger {...aria}><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent>
    </Select>
  )
}

function MediaTitle({ icon: Icon, children }: { icon: typeof Film; children: React.ReactNode }) {
  return <p className="flex items-center gap-2 text-[13px] font-medium"><Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />{children}</p>
}

function ImageSlot({ label, note, file, url, onFile, onDelete, disabled }: { label: string; note: string; file?: File | null; url: string | null; onFile: (f: File | null) => void; onDelete: () => void; disabled?: boolean }) {
  return (
    <div className="min-w-0 space-y-2">
      <MediaTitle icon={ImageIcon}>{label}</MediaTitle>
      <div className="max-w-[420px]">
        <ImageUploadWithCrop
          value={file ?? null} onChange={onFile} aspectRatio={16 / 9} maxSize={5 * 1024 * 1024} label="Upload image" description={note} disabled={disabled} currentImageUrl={url}
          // Clearing a newly chosen file must not delete the saved image
          onDelete={file ? undefined : onDelete}
        />
      </div>
    </div>
  )
}

function SellableList({ values, pct }: { values: PackageFormValues; pct: number }) {
  const name = values.name || 'Package name'
  const rows = values.tiers.length > 0
    ? values.tiers.map((t, i) => ({ key: t._id ?? `n${i}`, order: Number.isFinite(t.display_order) ? Number(t.display_order) : i, title: subscriptionLabel(name, { tier_duration_days: Number.isFinite(t.duration_days) ? t.duration_days : null, tier_name: t.name }), price: t.price, sale: pct > 0 && Number.isFinite(t.price) ? Math.round(t.price * (1 - pct / 100)) : null })).sort((a, b) => a.order - b.order)
    : [{ key: 'base', order: 0, title: subscriptionLabel(name, { tier_duration_days: Number.isFinite(values.duration_days) ? values.duration_days : null }), price: values.price, sale: values.is_on_sale && Number.isFinite(values.sale_price) ? Number(values.sale_price) : null }]
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.key} className="flex gap-3 text-sm">
          <span className="w-4 shrink-0 text-right font-mono text-xs leading-5 text-muted-foreground">{i + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block break-words font-medium">{r.title}</span>
            <span className="tabular-nums text-muted-foreground">
              {r.sale !== null ? <><span className="font-medium text-foreground">{formatINR(r.sale)}</span> <s>{formatINR(r.price)}</s></> : Number.isFinite(r.price) ? formatINR(r.price) : 'No price yet'}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}
