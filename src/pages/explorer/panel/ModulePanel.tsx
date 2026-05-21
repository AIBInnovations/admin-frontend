import { BookMarked, RefreshCw } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { PanelShell } from './PanelShell'
import { PanelField, PanelSwitchRow, PanelText, PanelTextarea } from './fields'
import { EntityHeaderActions } from './EntityHeaderActions'
import { ActiveBadge, PublishBadge } from '../ui/StatusBadge'
import { usePanelForm } from '../hooks/usePanelForm'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { modulesService } from '@/services/modules.service'
import type { PackageDetailModule } from '@/services/packages.service'
import type { PanelContext } from './panelTypes'

interface ModulePanelProps {
  entity: PackageDetailModule | null
  ctx?: PanelContext
  onRefresh?: () => void
  onClose?: () => void
}

export function ModulePanel({ entity, ctx, onRefresh, onClose }: ModulePanelProps) {
  const isEdit = !!entity
  const seriesId = ctx?.seriesId ?? entity?.series_id ?? ''

  const form = usePanelForm(
    () => ({
      name: entity?.name ?? '',
      description: entity?.description ?? '',
      estimated_duration_minutes:
        entity?.estimated_duration_minutes && entity.estimated_duration_minutes > 0
          ? entity.estimated_duration_minutes.toString()
          : '',
      display_order: entity?.display_order?.toString() ?? '',
      is_active: entity?.is_active ?? true,
    }),
    entity?._id ?? 'new-module',
  )
  const v = form.values

  const save = useExplorerMutation({
    name: isEdit ? 'Update module' : 'Create module',
    fn: () => {
      const data = {
        series_id: seriesId,
        name: v.name.trim(),
        description: v.description.trim(),
        estimated_duration_minutes: v.estimated_duration_minutes ? Number(v.estimated_duration_minutes) : 0,
        is_active: v.is_active,
        display_order: v.display_order ? Number(v.display_order) : undefined,
      }
      return isEdit ? modulesService.update(entity!._id, data) : modulesService.create(data)
    },
    onSuccess: () => { form.commit(v); onRefresh?.(); if (!isEdit) onClose?.() },
    successMessage: isEdit ? 'Module updated' : 'Module created',
  })

  const recalc = useExplorerMutation({
    name: 'Recalculate stats',
    fn: () => modulesService.recalculateStats(entity!._id),
    onSuccess: () => onRefresh?.(),
    successMessage: 'Stats recalculated',
  })

  return (
    <PanelShell
      icon={<div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><BookMarked className="w-4 h-4 text-amber-500" /></div>}
      title={isEdit ? v.name || 'Module' : 'New module'}
      subtitle={isEdit ? `${entity!.video_count ?? 0} videos` : 'Module'}
      badges={isEdit ? <>
        <ActiveBadge active={entity!.is_active} />
        {entity!.publish_status && <PublishBadge status={entity!.publish_status} />}
      </> : undefined}
      headerActions={isEdit ? (
        <EntityHeaderActions
          entityType="module"
          entityId={entity!._id}
          entityName={entity!.name}
          publishStatus={entity!.publish_status}
          rawData={entity}
          onRefresh={onRefresh}
          idLabel="Module ID"
          extraItems={
            <DropdownMenuItem onClick={recalc.execute} disabled={recalc.loading}>
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Recalculate stats
            </DropdownMenuItem>
          }
        />
      ) : undefined}
      onClose={onClose}
      dirty={form.dirty}
      saving={save.loading}
      canSave={v.name.trim().length > 0}
      saveLabel={isEdit ? 'Save changes' : 'Create module'}
      onSave={save.execute}
      onCancel={form.reset}
    >
      <PanelField label="Name" required htmlFor="mp-name">
        <PanelText id="mp-name" value={v.name} onChange={(x) => form.set('name', x)} placeholder="e.g. Module 1: Introduction" autoFocus={!isEdit} />
      </PanelField>

      <PanelField label="Description" htmlFor="mp-desc">
        <PanelTextarea id="mp-desc" value={v.description} onChange={(x) => form.set('description', x)} placeholder="What this module covers…" />
      </PanelField>

      <PanelField label="Estimated duration (minutes)" hint="Overwritten by Recalculate Stats once videos are added." htmlFor="mp-dur">
        <PanelText id="mp-dur" type="number" value={v.estimated_duration_minutes} onChange={(x) => form.set('estimated_duration_minutes', x)} placeholder="e.g. 45" className="w-40" />
      </PanelField>

      <PanelField label="Display order" htmlFor="mp-order">
        <PanelText id="mp-order" type="number" value={v.display_order} onChange={(x) => form.set('display_order', x)} placeholder="e.g. 1" className="w-32" />
      </PanelField>

      <PanelSwitchRow label="Active" hint="Visible to enrolled students" checked={v.is_active} onChange={(x) => form.set('is_active', x)} />
    </PanelShell>
  )
}
