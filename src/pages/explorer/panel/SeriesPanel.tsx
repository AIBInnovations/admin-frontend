import { useEffect, useState } from 'react'
import { Layers } from 'lucide-react'
import { PanelShell } from './PanelShell'
import { PanelField, PanelSectionTitle, PanelSwitchRow, PanelText, PanelTextarea } from './fields'
import { EntityHeaderActions } from './EntityHeaderActions'
import { ActiveBadge, PublishBadge } from '../ui/StatusBadge'
import { ImageCropField } from '../media/ImageCropField'
import { usePanelForm } from '../hooks/usePanelForm'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { useMediaUpload } from '../hooks/useMediaUpload'
import { seriesService } from '@/services/series.service'
import type { PackageDetailSeries } from '@/services/packages.service'
import type { PanelContext } from './panelTypes'

interface SeriesPanelProps {
  entity: PackageDetailSeries | null
  ctx?: PanelContext
  onRefresh?: () => void
  onClose?: () => void
}

export function SeriesPanel({ entity, ctx, onRefresh, onClose }: SeriesPanelProps) {
  const isEdit = !!entity
  const packageId = ctx?.packageId ?? entity?.package_id ?? ''
  const media = useMediaUpload()
  // PackageDetailSeries omits thumbnail_url — fetch the full series record for it.
  const [thumb, setThumb] = useState<string | null>(null)

  useEffect(() => {
    setThumb(null)
    if (!entity?._id) return
    let live = true
    seriesService.getById(entity._id).then((res) => {
      if (live && res.success && res.data) setThumb(res.data.thumbnail_url ?? null)
    })
    return () => { live = false }
  }, [entity?._id])

  const form = usePanelForm(
    () => ({
      name: entity?.name ?? '',
      description: entity?.description ?? '',
      display_order: entity?.display_order?.toString() ?? '',
      is_active: entity?.is_active ?? true,
    }),
    entity?._id ?? 'new-series',
  )
  const v = form.values

  const save = useExplorerMutation({
    name: isEdit ? 'Update series' : 'Create series',
    fn: () => {
      const data = {
        package_id: packageId,
        name: v.name.trim(),
        description: v.description.trim(),
        is_active: v.is_active,
        display_order: v.display_order ? Number(v.display_order) : undefined,
      }
      return isEdit ? seriesService.update(entity!._id, data) : seriesService.create(data)
    },
    onSuccess: () => { form.commit(v); onRefresh?.(); if (!isEdit) onClose?.() },
    successMessage: isEdit ? 'Series updated' : 'Series created',
  })

  return (
    <PanelShell
      icon={<div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center"><Layers className="w-4 h-4 text-sky-500" /></div>}
      title={isEdit ? v.name || 'Series' : 'New series'}
      subtitle="Series"
      badges={isEdit ? <>
        <ActiveBadge active={entity!.is_active} />
        {entity!.publish_status && <PublishBadge status={entity!.publish_status} />}
      </> : undefined}
      headerActions={isEdit ? (
        <EntityHeaderActions
          entityType="series"
          entityId={entity!._id}
          entityName={entity!.name}
          publishStatus={entity!.publish_status}
          rawData={entity}
          onRefresh={onRefresh}
          idLabel="Series ID"
        />
      ) : undefined}
      onClose={onClose}
      dirty={form.dirty}
      saving={save.loading}
      canSave={v.name.trim().length > 0}
      saveLabel={isEdit ? 'Save changes' : 'Create series'}
      onSave={save.execute}
      onCancel={form.reset}
    >
      <PanelField label="Name" required htmlFor="srp-name">
        <PanelText id="srp-name" value={v.name} onChange={(x) => form.set('name', x)} placeholder="e.g. Unit 1: Basics" autoFocus={!isEdit} />
      </PanelField>

      <PanelField label="Description" htmlFor="srp-desc">
        <PanelTextarea id="srp-desc" value={v.description} onChange={(x) => form.set('description', x)} placeholder="What does this series cover…" />
      </PanelField>

      <PanelField label="Display order" htmlFor="srp-order">
        <PanelText id="srp-order" type="number" value={v.display_order} onChange={(x) => form.set('display_order', x)} placeholder="e.g. 1" className="w-32" />
      </PanelField>

      <PanelSwitchRow label="Active" hint="Visible to enrolled students" checked={v.is_active} onChange={(x) => form.set('is_active', x)} />

      {isEdit && (
        <div className="space-y-3 pt-1">
          <PanelSectionTitle>Media</PanelSectionTitle>
          <ImageCropField
            label="Thumbnail"
            aspect={16 / 9}
            hint="16:9 · JPEG/PNG/WebP · max 5MB"
            value={thumb}
            uploading={media.uploading}
            uploadProgress={media.progress}
            onUpload={async (file) => {
              const res = await media.run('Uploading thumbnail', async () => seriesService.uploadThumbnail(entity!._id, file))
              if (res?.success && res.data) setThumb(res.data.thumbnail_url ?? null)
              onRefresh?.()
            }}
            onRemove={thumb ? async () => {
              await media.run('Removing thumbnail', async () => { await seriesService.deleteThumbnail(entity!._id) })
              setThumb(null)
              onRefresh?.()
            } : undefined}
          />
        </div>
      )}
    </PanelShell>
  )
}
