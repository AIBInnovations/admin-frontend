import { BookMarked, FolderInput, RefreshCw } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { modulesService, type ModuleFormData } from '@/services/modules.service'
import type { PackageDetailModule } from '@/services/packages.service'
import { useExplorerAccess } from '../access'
import { useActions } from '../actions/ActionsContext'
import { usePanelSelection } from '../context/PanelSelectionContext'
import { useEntityForm } from '../hooks/useEntityForm'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { ActiveBadge, PublishBadge } from '../ui/StatusBadge'
import { Thumb } from '../ui/Thumb'
import { hours, plural } from '../ui/text'
import { EntityHeaderActions } from './EntityHeaderActions'
import { PanelShell } from './PanelShell'
import { AreaField, SelectField, SwitchField, TextField } from './fields'
import { idOf, isWhole, ORDER_ERROR, payload, toNumber } from './helpers'
import type { PanelContext } from './panelTypes'

interface Props { entity: PackageDetailModule | null; ctx?: PanelContext; onRefresh: () => Promise<void> }

export function ModulePanel({ entity, ctx, onRefresh }: Props) {
  const { can } = useExplorerAccess()
  const { select } = usePanelSelection()
  const { open } = useActions()
  const isEdit = !!entity
  const canEdit = can('module', isEdit ? 'update' : 'create')

  const form = useEntityForm({
    id: 'module',
    what: 'module',
    label: (v) => v.name || 'New module',
    readOnly: !canEdit,
    initial: () => ({
      name: entity?.name ?? '',
      description: entity?.description ?? '',
      estimated_duration_minutes: entity?.estimated_duration_minutes && entity.estimated_duration_minutes > 0 ? entity.estimated_duration_minutes.toString() : '',
      display_order: entity?.display_order?.toString() ?? '',
      is_active: entity?.is_active ?? true,
      publish_status: entity?.publish_status ?? 'published',
    }),
    validate: (v) => ({
      ...(v.name.trim().length < 2 ? { name: 'Use at least 2 characters.' } : v.name.trim().length > 200 ? { name: 'Use at most 200 characters.' } : {}),
      ...(v.description.trim().length < 10 && (!isEdit || v.description.trim() !== (entity?.description ?? '').trim()) ? { description: 'Use at least 10 characters.' } : v.description.length > 2000 ? { description: 'Use at most 2,000 characters.' } : {}),
      ...(!isWhole(v.estimated_duration_minutes) ? { estimated_duration_minutes: 'Use whole minutes.' } : {}),
      ...(!isWhole(v.display_order) ? { display_order: ORDER_ERROR } : {}),
    }),
    submit: (v, changed) => {
      const convert = { name: (x: string) => x.trim(), description: (x: string) => x.trim(), estimated_duration_minutes: (x: string) => toNumber(x) ?? 0, display_order: toNumber }
      const data = payload<typeof v>(isEdit ? changed : v, convert) as unknown as ModuleFormData
      return isEdit ? modulesService.update(entity._id, data) : modulesService.create({ ...data, series_id: ctx?.seriesId ?? '' })
    },
    onSaved: async (result) => {
      await onRefresh()
      const id = idOf(result)
      if (!isEdit && id) select('module', id)
    },
    savedMessage: (v) => (isEdit ? `"${v.name}" saved` : `"${v.name}" created`),
  })
  const v = form.values

  const recalc = useExplorerMutation({
    name: 'Recalculate stats',
    what: 'changing modules',
    fn: () => modulesService.recalculateStats(entity!._id),
    onSuccess: () => onRefresh(),
    successMessage: 'Stats recalculated',
  })
  const seconds = entity?.videos?.reduce((n, x) => n + (x.duration_seconds || 0), 0) ?? 0

  return (
    <PanelShell
      icon={<Thumb fallback={<BookMarked className="h-4 w-4" />} />}
      title={isEdit ? v.name || 'Module' : 'New module'}
      subtitle={isEdit ? `Module · ${plural(entity.video_count ?? 0, 'video')}${seconds > 0 ? `, ${hours(seconds)}` : ''}` : 'Videos go inside it'}
      badges={isEdit ? <><ActiveBadge active={entity.is_active} />{entity.publish_status && <PublishBadge status={entity.publish_status} />}</> : undefined}
      headerActions={isEdit && (
        <EntityHeaderActions
          kind="module"
          entityType="module"
          id={entity._id}
          name={entity.name}
          publishStatus={entity.publish_status}
          data={entity}
          idLabel="Module ID"
          extra={canEdit && (
            <>
              <DropdownMenuItem onSelect={() => open({ type: 'moveContent', kind: 'module-move', items: [{ id: entity._id, name: entity.name, parentId: entity.series_id }] })}><FolderInput className="mr-2 h-3.5 w-3.5" /> Move to series…</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void recalc.execute()} disabled={recalc.loading}><RefreshCw className="mr-2 h-3.5 w-3.5" /> Recalculate stats</DropdownMenuItem>
            </>
          )}
        />
      )}
      form={form}
      saveLabel={isEdit ? 'Save changes' : 'Create module'}
      savingLabel={isEdit ? 'Saving…' : 'Creating…'}
    >
      <TextField form={form} name="name" label="Name" required placeholder="Module 1: Introduction" autoFocus={!isEdit} />
      <AreaField form={form} name="description" label="Description" required hint="At least 10 characters." placeholder="What this module covers" />
      <TextField form={form} name="estimated_duration_minutes" label="Estimated duration (minutes)" type="number" min={0} className="w-40" hint="Replaced by Recalculate stats once videos are added." />
      <TextField form={form} name="display_order" label="Display order" type="number" min={0} className="w-32" hint={isEdit ? undefined : 'Leave empty to add it at the end.'} />
      <SwitchField form={form} name="is_active" label="Active" hint="Visible to enrolled students" />
      {!isEdit && (
        <SelectField form={form} name="publish_status" label="Status">
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </SelectField>
      )}
    </PanelShell>
  )
}
