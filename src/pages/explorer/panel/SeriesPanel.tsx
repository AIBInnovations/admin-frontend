import { useEffect, useState } from 'react'
import { FolderInput, Layers } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { seriesService, type SeriesFormData } from '@/services/series.service'
import type { PackageDetailSeries } from '@/services/packages.service'
import { useExplorerAccess } from '../access'
import { useActions } from '../actions/ActionsContext'
import { usePanelSelection } from '../context/PanelSelectionContext'
import { useEntityForm } from '../hooks/useEntityForm'
import { useMediaUpload } from '../hooks/useMediaUpload'
import { ImageCropField } from '../media/ImageCropField'
import { ActiveBadge, PublishBadge } from '../ui/StatusBadge'
import { Thumb } from '../ui/Thumb'
import { plural } from '../ui/text'
import { EntityHeaderActions } from './EntityHeaderActions'
import { PanelShell } from './PanelShell'
import { AreaField, PanelSectionTitle, SelectField, SwitchField, TextField } from './fields'
import { idOf, isWhole, ORDER_ERROR, payload, toNumber } from './helpers'
import type { PanelContext } from './panelTypes'

interface Props { entity: PackageDetailSeries | null; ctx?: PanelContext; onRefresh: () => Promise<void> }

export function SeriesPanel({ entity, ctx, onRefresh }: Props) {
  const { can } = useExplorerAccess()
  const { select } = usePanelSelection()
  const { open } = useActions()
  const media = useMediaUpload()
  const isEdit = !!entity
  const canEdit = can('series', isEdit ? 'update' : 'create')

  // Older servers leave the thumbnail out of the package tree: read the record.
  const [thumb, setThumb] = useState<string | null>((entity as { thumbnail_url?: string | null } | null)?.thumbnail_url ?? null)
  useEffect(() => {
    if (!entity?._id || !can('series', 'read')) return
    let live = true
    seriesService.getById(entity._id).then((res) => { if (live && res.data) setThumb(res.data.thumbnail_url ?? null) }).catch(() => {})
    return () => { live = false }
  }, [entity?._id, can])

  const form = useEntityForm({
    id: 'series',
    what: 'series',
    label: (v) => v.name || 'New series',
    readOnly: !canEdit,
    initial: () => ({
      name: entity?.name ?? '',
      description: entity?.description ?? '',
      display_order: entity?.display_order?.toString() ?? '',
      is_active: entity?.is_active ?? true,
      publish_status: entity?.publish_status ?? 'published',
    }),
    validate: (v) => ({
      ...(v.name.trim().length < 2 ? { name: 'Use at least 2 characters.' } : v.name.trim().length > 200 ? { name: 'Use at most 200 characters.' } : {}),
      ...(v.description.trim().length < 10 && (!isEdit || v.description.trim() !== (entity?.description ?? '').trim()) ? { description: 'Use at least 10 characters.' } : v.description.length > 2000 ? { description: 'Use at most 2,000 characters.' } : {}),
      ...(!isWhole(v.display_order) ? { display_order: ORDER_ERROR } : {}),
    }),
    submit: (v, changed) => {
      const convert = { name: (x: string) => x.trim(), description: (x: string) => x.trim(), display_order: toNumber }
      const data = payload<typeof v>(isEdit ? changed : v, convert) as unknown as SeriesFormData
      return isEdit ? seriesService.update(entity._id, data) : seriesService.create({ ...data, package_id: ctx?.packageId ?? '' })
    },
    onSaved: async (result) => {
      await onRefresh()
      const id = idOf(result)
      if (!isEdit && id) select('series', id)
    },
    savedMessage: (v) => (isEdit ? `"${v.name}" saved` : `"${v.name}" created`),
  })
  const v = form.values

  return (
    <PanelShell
      icon={<Thumb src={thumb} fallback={<Layers className="h-4 w-4" />} />}
      title={isEdit ? v.name || 'Series' : 'New series'}
      subtitle={isEdit ? `Series · ${plural(entity.module_count ?? 0, 'module')}, ${plural(entity.document_count ?? 0, 'document')}` : 'Modules and documents go inside it'}
      badges={isEdit ? <><ActiveBadge active={entity.is_active} />{entity.publish_status && <PublishBadge status={entity.publish_status} />}</> : undefined}
      headerActions={isEdit && (
        <EntityHeaderActions
          kind="series"
          entityType="series"
          id={entity._id}
          name={entity.name}
          publishStatus={entity.publish_status}
          data={entity}
          idLabel="Series ID"
          extra={can('series', 'update') && (
            <DropdownMenuItem onSelect={() => open({ type: 'moveContent', kind: 'series-move', items: [{ id: entity._id, name: entity.name, parentId: entity.package_id ?? ctx?.packageId ?? null }] })}><FolderInput className="mr-2 h-3.5 w-3.5" /> Move to package…</DropdownMenuItem>
          )}
        />
      )}
      form={form}
      saveLabel={isEdit ? 'Save changes' : 'Create series'}
      savingLabel={isEdit ? 'Saving…' : 'Creating…'}
    >
      <TextField form={form} name="name" label="Name" required placeholder="Unit 1: Basics" autoFocus={!isEdit} />
      <AreaField form={form} name="description" label="Description" required hint="At least 10 characters." placeholder="What this series covers" />
      <TextField form={form} name="display_order" label="Display order" type="number" min={0} className="w-32" hint={isEdit ? undefined : 'Leave empty to add it at the end.'} />
      <SwitchField form={form} name="is_active" label="Active" hint="Visible to enrolled students" />
      {!isEdit && (
        <SelectField form={form} name="publish_status" label="Status">
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </SelectField>
      )}

      {isEdit && (
        <>
          <PanelSectionTitle>Media</PanelSectionTitle>
          <ImageCropField
            label="Thumbnail"
            aspect={16 / 9}
            hint="16:9. JPEG, PNG or WebP, up to 5 MB."
            value={thumb}
            disabled={!canEdit}
            uploading={media.uploading}
            uploadProgress={media.progress}
            onUpload={async (file) => {
              const res = await media.run('Upload thumbnail', async () => seriesService.uploadThumbnail(entity._id, file))
              if (res?.data) setThumb(res.data.thumbnail_url ?? null)
              await onRefresh()
            }}
            onRemove={thumb ? async () => {
              const res = await media.run('Remove thumbnail', async () => seriesService.deleteThumbnail(entity._id))
              if (res) setThumb(null)
              await onRefresh()
            } : undefined}
          />
        </>
      )}
    </PanelShell>
  )
}
