import { useEffect, useState } from 'react'
import { Package as PackageIcon } from 'lucide-react'
import RichTextEditor from '@/components/common/RichTextEditor'
import { PanelShell } from './PanelShell'
import { PanelField, PanelSectionTitle, PanelSelect, PanelSwitchRow, PanelText, PanelTextarea } from './fields'
import { EntityHeaderActions } from './EntityHeaderActions'
import { ActiveBadge, PublishBadge } from '../ui/StatusBadge'
import { ImageCropField } from '../media/ImageCropField'
import { usePanelForm } from '../hooks/usePanelForm'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { useMediaUpload } from '../hooks/useMediaUpload'
import { packagesService, type Package, type PackageDetail } from '@/services/packages.service'
import { packageTypesService, type PackageType } from '@/services/packageTypes.service'
import type { PanelContext } from './panelTypes'

interface PackagePanelProps {
  entity: Package | PackageDetail | null
  ctx?: PanelContext
  onRefresh?: () => void
  onClose?: () => void
}

const SHORT_DESC_MIN = 10
const SHORT_DESC_MAX = 2000
const RICH_DESC_MAX = 50_000

function encodeRichDescription(html: string): string {
  return btoa(unescape(encodeURIComponent(html)))
}
function htmlToPlainText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || div.innerText || '').trim()
}
function htmlBulletsToFeatures(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  const lis = div.querySelectorAll('li')
  if (lis.length === 0) return ''
  return Array.from(lis).map((li) => (li.textContent || '').trim()).filter(Boolean).join('\n')
}

export function PackagePanel({ entity, ctx, onRefresh, onClose }: PackagePanelProps) {
  const isEdit = !!entity
  const subjectId = ctx?.subjectId ?? ''
  const [types, setTypes] = useState<PackageType[]>([])
  const media = useMediaUpload()

  useEffect(() => {
    if (types.length > 0) return
    packageTypesService.getAllPublic().then((res) => {
      if (res.success && res.data) setTypes(res.data)
    })
  }, [types.length])

  const form = usePanelForm(
    () => ({
      package_type_id:
        entity && typeof entity.package_type_id === 'object'
          ? (entity.package_type_id as { _id: string })._id
          : (entity?.package_type_id as string | undefined) ?? '',
      name: entity?.name ?? '',
      description: entity?.description ?? '',
      rich_description: entity?.rich_description ?? '',
      features: entity?.features ?? '',
      price: entity?.price?.toString() ?? '',
      original_price: entity?.original_price?.toString() ?? '',
      duration_days: entity?.duration_days?.toString() ?? '',
      display_order: entity?.display_order?.toString() ?? '',
      is_active: entity?.is_active ?? true,
    }),
    entity?._id ?? 'new-package',
  )
  const v = form.values

  const save = useExplorerMutation({
    name: isEdit ? 'Update package' : 'Create package',
    fn: () => {
      let shortDesc = v.description.trim()
      if (v.rich_description && shortDesc.length < SHORT_DESC_MIN) {
        const plain = htmlToPlainText(v.rich_description)
        if (plain.length >= SHORT_DESC_MIN) shortDesc = plain.slice(0, SHORT_DESC_MAX)
      }
      let features = v.features.trim()
      if (v.rich_description && !features) features = htmlBulletsToFeatures(v.rich_description)

      const data = {
        subject_id: isEdit
          ? (typeof entity!.subject_id === 'object' ? (entity!.subject_id as { _id: string })._id : (entity!.subject_id as string))
          : subjectId,
        package_type_id: v.package_type_id,
        name: v.name.trim(),
        description: shortDesc,
        price: Number(v.price),
        original_price: v.original_price ? Number(v.original_price) : null,
        duration_days: Number(v.duration_days),
        features: features || undefined,
        rich_description: v.rich_description ? encodeRichDescription(v.rich_description) : undefined,
        is_active: v.is_active,
        display_order: v.display_order ? Number(v.display_order) : undefined,
      }
      return isEdit ? packagesService.update(entity!._id, data) : packagesService.create(data)
    },
    onSuccess: () => { form.commit(v); onRefresh?.(); if (!isEdit) onClose?.() },
    successMessage: isEdit ? 'Package updated' : 'Package created',
  })

  const priceNum = v.price.trim() === '' ? NaN : Number(v.price)
  const durationNum = v.duration_days.trim() === '' ? NaN : Number(v.duration_days)
  const richPlainLen = v.rich_description ? htmlToPlainText(v.rich_description).length : 0
  const shortDescOk = v.description.trim().length >= SHORT_DESC_MIN || richPlainLen >= SHORT_DESC_MIN
  const valid =
    !!v.package_type_id &&
    v.name.trim().length >= 2 &&
    shortDescOk &&
    v.description.trim().length <= SHORT_DESC_MAX &&
    v.rich_description.length <= RICH_DESC_MAX &&
    Number.isFinite(priceNum) && priceNum >= 0 &&
    Number.isFinite(durationNum) && durationNum > 0

  return (
    <PanelShell
      icon={<div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center"><PackageIcon className="w-4 h-4 text-violet-500" /></div>}
      title={isEdit ? v.name || 'Package' : 'New package'}
      subtitle="Package"
      badges={isEdit ? <>
        <ActiveBadge active={entity!.is_active} />
        {entity!.publish_status && <PublishBadge status={entity!.publish_status} />}
      </> : undefined}
      headerActions={isEdit ? (
        <EntityHeaderActions
          entityType="package"
          entityId={entity!._id}
          entityName={entity!.name}
          publishStatus={entity!.publish_status}
          rawData={entity}
          onRefresh={onRefresh}
          idLabel="Package ID"
        />
      ) : undefined}
      onClose={onClose}
      dirty={form.dirty}
      saving={save.loading}
      canSave={valid}
      saveLabel={isEdit ? 'Save changes' : 'Create package'}
      onSave={save.execute}
      onCancel={form.reset}
    >
      <PanelField label="Package type" required htmlFor="pp-type">
        <PanelSelect id="pp-type" value={v.package_type_id} onChange={(x) => form.set('package_type_id', x)}>
          <option value="">Select a type…</option>
          {types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </PanelSelect>
      </PanelField>

      <PanelField label="Name" required htmlFor="pp-name">
        <PanelText id="pp-name" value={v.name} onChange={(x) => form.set('name', x)} placeholder="e.g. ECG Complete Package" autoFocus={!isEdit} />
      </PanelField>

      <PanelField label="Short description" required hint={`Min ${SHORT_DESC_MIN} chars. Auto-filled from the rich description if left short.`} htmlFor="pp-desc">
        <PanelTextarea id="pp-desc" rows={2} value={v.description} onChange={(x) => form.set('description', x)} placeholder="One or two sentences (fallback for older app versions)." />
      </PanelField>

      <PanelField label="Package description">
        <RichTextEditor
          value={v.rich_description}
          onChange={(html: string) => form.set('rich_description', html)}
          placeholder="What's included in this package…"
          disabled={save.loading}
        />
      </PanelField>

      <PanelField label="Features (for older app versions)" hint="Auto-filled from bullet items in the rich description if left empty." htmlFor="pp-feat">
        <PanelTextarea id="pp-feat" rows={3} value={v.features} onChange={(x) => form.set('features', x)} placeholder="One feature per line." />
      </PanelField>

      <div className="grid grid-cols-2 gap-3">
        <PanelField label="Price (₹)" required htmlFor="pp-price">
          <PanelText id="pp-price" type="number" value={v.price} onChange={(x) => form.set('price', x)} placeholder="0" />
        </PanelField>
        <PanelField label="Original price (₹)" htmlFor="pp-orig">
          <PanelText id="pp-orig" type="number" value={v.original_price} onChange={(x) => form.set('original_price', x)} placeholder="e.g. 4999" />
        </PanelField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PanelField label="Duration (days)" required htmlFor="pp-dur">
          <PanelText id="pp-dur" type="number" value={v.duration_days} onChange={(x) => form.set('duration_days', x)} placeholder="e.g. 365" />
        </PanelField>
        <PanelField label="Display order" htmlFor="pp-order">
          <PanelText id="pp-order" type="number" value={v.display_order} onChange={(x) => form.set('display_order', x)} placeholder="e.g. 1" />
        </PanelField>
      </div>

      <PanelSwitchRow label="Active" hint="Visible to eligible students" checked={v.is_active} onChange={(x) => form.set('is_active', x)} />

      {isEdit && (
        <div className="space-y-3 pt-1">
          <PanelSectionTitle>Media</PanelSectionTitle>
          <ImageCropField
            label="Thumbnail"
            aspect={16 / 9}
            hint="16:9 · JPEG/PNG/WebP · max 5MB"
            value={entity!.thumbnail_url}
            uploading={media.uploading}
            uploadProgress={media.progress}
            onUpload={async (file) => {
              await media.run('Uploading thumbnail', async () => {
                await packagesService.uploadThumbnail(entity!._id, file)
              })
              onRefresh?.()
            }}
            onRemove={entity!.thumbnail_url ? async () => {
              await media.run('Removing thumbnail', async () => {
                await packagesService.deleteThumbnail(entity!._id)
              })
              onRefresh?.()
            } : undefined}
          />
        </div>
      )}
    </PanelShell>
  )
}
