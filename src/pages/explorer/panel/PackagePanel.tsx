import { useEffect, useState } from 'react'
import { Package as PackageIcon } from 'lucide-react'
import RichTextEditor from '@/components/common/RichTextEditor'
import { packagesService, type PackageFormData } from '@/services/packages.service'
import { packageTypesService, type PackageType } from '@/services/packageTypes.service'
import { useExplorerAccess } from '../access'
import { usePanelSelection } from '../context/PanelSelectionContext'
import { useEntityForm } from '../hooks/useEntityForm'
import { useMediaUpload } from '../hooks/useMediaUpload'
import { ImageCropField } from '../media/ImageCropField'
import type { AnyPackage } from '../types'
import { ActiveBadge, ComboBadge, PublishBadge, SaleBadge } from '../ui/StatusBadge'
import { Thumb } from '../ui/Thumb'
import { BundleEditor, describeContents } from './BundleEditor'
import { EntityHeaderActions } from './EntityHeaderActions'
import { PanelShell } from './PanelShell'
import { PlanList } from './PlanList'
import { AreaField, PanelField, PanelSectionTitle, SelectField, SwitchField, TextField } from './fields'
import { idOf, isWhole, ORDER_ERROR, payload, refId, toNumber } from './helpers'
import type { PanelContext } from './panelTypes'

interface Props { entity: AnyPackage | null; ctx?: PanelContext; onRefresh: () => Promise<void> }

const SHORT_MIN = 10
const SHORT_MAX = 2000
const RICH_MAX = 50_000

// The firewall in front of the API rejects raw HTML; the server decodes this.
const encodeHtml = (html: string) => btoa(unescape(encodeURIComponent(html)))

function htmlToText(html: string): string {
  return (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').trim()
}
function bullets(html: string): string {
  const items = new DOMParser().parseFromString(html, 'text/html').querySelectorAll('li')
  return Array.from(items).map((li) => (li.textContent ?? '').trim()).filter(Boolean).join('\n')
}

export function PackagePanel({ entity, ctx, onRefresh }: Props) {
  const { can } = useExplorerAccess()
  const { select } = usePanelSelection()
  const media = useMediaUpload()
  const isEdit = !!entity
  const canEdit = can('package', isEdit ? 'update' : 'create')

  const [types, setTypes] = useState<PackageType[]>([])
  useEffect(() => {
    let live = true
    packageTypesService.getAllPublic().then((res) => { if (live && res.data) setTypes(res.data) }).catch(() => {})
    return () => { live = false }
  }, [])

  const form = useEntityForm({
    id: 'package',
    what: 'package',
    label: (v) => v.name || 'New package',
    readOnly: !canEdit,
    initial: () => ({
      package_type_id: refId(entity?.package_type_id),
      name: entity?.name ?? '',
      description: entity?.description ?? '',
      rich_description: entity?.rich_description ?? '',
      features: entity?.features ?? '',
      price: entity?.price?.toString() ?? '',
      original_price: entity?.original_price?.toString() ?? '',
      duration_days: entity?.duration_days?.toString() ?? '',
      display_order: entity?.display_order?.toString() ?? '',
      is_active: entity?.is_active ?? true,
      publish_status: entity?.publish_status ?? 'published',
      bundled_package_ids: (entity?.bundled_package_ids ?? []).map(refId).filter(Boolean),
    }),
    validate: (v) => {
      const price = v.price.trim() === '' ? NaN : Number(v.price)
      const days = v.duration_days.trim() === '' ? NaN : Number(v.duration_days)
      const short = v.description.trim()
      return {
        ...(!v.package_type_id ? { package_type_id: 'Choose a type.' } : {}),
        ...(v.name.trim().length < 2 ? { name: 'Use at least 2 characters.' } : v.name.trim().length > 200 ? { name: 'Use at most 200 characters.' } : {}),
        ...(short.length < SHORT_MIN && htmlToText(v.rich_description).length < SHORT_MIN ? { description: `Use at least ${SHORT_MIN} characters, or fill in the package description.` } : short.length > SHORT_MAX ? { description: 'Use at most 2,000 characters.' } : {}),
        ...(v.rich_description.length > RICH_MAX ? { rich_description: 'This description is too long.' } : {}),
        ...(v.features.length > SHORT_MAX ? { features: 'Use at most 2,000 characters.' } : {}),
        ...(!Number.isFinite(price) || price < 0 ? { price: 'Enter a price, 0 or more.' } : {}),
        ...(v.original_price.trim() && !(Number(v.original_price) >= 0) ? { original_price: 'Enter a price, 0 or more.' } : {}),
        ...(!Number.isInteger(days) || days < 1 ? { duration_days: 'Enter whole days, 1 or more.' } : {}),
        ...(!isWhole(v.display_order) ? { display_order: ORDER_ERROR } : {}),
      }
    },
    submit: (v, changed) => {
      const convert = {
        name: (x: string) => x.trim(),
        description: (x: string) => x.trim(),
        rich_description: (x: string) => (x ? encodeHtml(x) : null),
        features: (x: string) => x.trim(),
        price: Number,
        original_price: (x: string) => toNumber(x) ?? null,
        duration_days: Number,
        display_order: toNumber,
      }
      const data = payload<typeof v>(isEdit ? changed : v, convert)
      // Older apps read the short description and features: fill them from the rich one when empty.
      if (v.rich_description) {
        const plain = htmlToText(v.rich_description)
        if (v.description.trim().length < SHORT_MIN && plain.length >= SHORT_MIN) data.description = plain.slice(0, SHORT_MAX)
        if (!v.features.trim()) { const list = bullets(v.rich_description); if (list) data.features = list.slice(0, SHORT_MAX) }
      }
      if (data.original_price === null && !isEdit) delete data.original_price
      if (data.features === '') delete data.features
      if (isEdit) return packagesService.update(entity._id, data as Partial<PackageFormData>)
      return packagesService.create({ ...(data as unknown as PackageFormData), subject_id: ctx?.subjectId ?? '' })
    },
    onSaved: async (result) => {
      await onRefresh()
      const id = idOf(result)
      if (!isEdit && id) select('package', id)
    },
    savedMessage: (v) => (isEdit ? `"${v.name}" saved` : `"${v.name}" created`),
  })
  const v = form.values
  const isCombo = v.bundled_package_ids.length > 0
  const hasTiers = (entity?.tiers ?? []).length > 0
  const typeName = types.find((t) => t._id === v.package_type_id)?.name

  // A combo is mostly what it includes, so that comes first
  const savedCombo = (entity?.bundled_package_ids ?? []).length > 0
  const bundle = <BundleEditor pkg={entity} ids={v.bundled_package_ids} onChange={(ids) => form.set('bundled_package_ids', ids)} readOnly={form.readOnly} />

  return (
    <PanelShell
      icon={<Thumb src={entity?.thumbnail_url} fallback={<PackageIcon className="h-4 w-4" />} />}
      title={isEdit ? v.name || 'Package' : 'New package'}
      subtitle={isEdit ? [typeName ?? 'Package', describeContents(entity.content_summary)].filter(Boolean).join(' · ') : 'Series go inside it'}
      badges={isEdit ? (
        <>
          {isCombo && <ComboBadge />}
          <ActiveBadge active={entity.is_active} />
          {entity.publish_status && <PublishBadge status={entity.publish_status} />}
          {entity.is_on_sale && <SaleBadge />}
        </>
      ) : undefined}
      headerActions={isEdit && <EntityHeaderActions kind="package" entityType="package" id={entity._id} name={entity.name} publishStatus={entity.publish_status} data={entity} idLabel="Package ID" />}
      form={form}
      saveLabel={isEdit ? 'Save changes' : 'Create package'}
      savingLabel={isEdit ? 'Saving…' : 'Creating…'}
    >
      {isEdit && <PlanList pkg={entity} linked={can('package', 'read')} canEdit={canEdit} />}
      {savedCombo && bundle}
      {isEdit && <PanelSectionTitle>Details</PanelSectionTitle>}

      <SelectField form={form} name="package_type_id" label="Package type" required>
        <option value="">Choose a type</option>
        {types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        {v.package_type_id && !typeName && <option value={v.package_type_id}>{(entity?.package_type_id as { name?: string } | null)?.name ?? 'Deleted type'}</option>}
      </SelectField>
      <TextField form={form} name="name" label="Name" required placeholder="ECG complete package" autoFocus={!isEdit} />
      <AreaField form={form} name="description" label="Short description" required rows={2} hint={`At least ${SHORT_MIN} characters. Filled from the package description when left short.`} placeholder="One or two sentences, shown by older app versions" />
      <PanelField label="Package description" error={form.errors.rich_description}>
        <RichTextEditor value={v.rich_description} onChange={(html: string) => form.set('rich_description', html)} placeholder="What is included in this package" disabled={form.saving || form.readOnly} />
      </PanelField>
      <AreaField form={form} name="features" label="Features (for older app versions)" rows={3} hint="One per line. Filled from the bullet points above when empty." placeholder="One feature per line" />

      {hasTiers && <p className="text-[13px] text-muted-foreground">The price and length below are only a fallback: students buy one of the plans above.</p>}
      <div className="grid grid-cols-2 gap-3">
        <TextField form={form} name="price" label="Price (₹)" required type="number" min={0} />
        <TextField form={form} name="original_price" label="Original price (₹)" type="number" min={0} />
        <TextField form={form} name="duration_days" label="Duration (days)" required type="number" min={1} />
        <TextField form={form} name="display_order" label="Display order" type="number" min={0} />
      </div>
      <SwitchField form={form} name="is_active" label="Active" hint="Visible to eligible students" />
      {!isEdit && (
        <SelectField form={form} name="publish_status" label="Status">
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </SelectField>
      )}

      {!savedCombo && bundle}

      {isEdit && (
        <>
          <PanelSectionTitle>Media</PanelSectionTitle>
          <ImageCropField
            label="Thumbnail"
            aspect={16 / 9}
            hint="16:9. JPEG, PNG or WebP, up to 5 MB."
            value={entity.thumbnail_url}
            disabled={!canEdit}
            uploading={media.uploading}
            uploadProgress={media.progress}
            onUpload={async (file) => { await media.run('Upload thumbnail', async () => packagesService.uploadThumbnail(entity._id, file)); await onRefresh() }}
            onRemove={entity.thumbnail_url ? async () => { await media.run('Remove thumbnail', async () => packagesService.deleteThumbnail(entity._id)); await onRefresh() } : undefined}
          />
        </>
      )}
    </PanelShell>
  )
}
