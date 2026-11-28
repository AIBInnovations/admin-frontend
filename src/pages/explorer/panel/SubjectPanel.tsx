import { Trash2 } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { subjectsService, type Subject, type SubjectFormData } from '@/services/subjects.service'
import { useActions } from '../actions/ActionsContext'
import { useExplorerAccess } from '../access'
import { usePanelSelection } from '../context/PanelSelectionContext'
import { useEntityForm } from '../hooks/useEntityForm'
import { ActiveBadge } from '../ui/StatusBadge'
import { Thumb, initials } from '../ui/Thumb'
import { plural } from '../ui/text'
import { EntityHeaderActions } from './EntityHeaderActions'
import { PanelShell } from './PanelShell'
import { AreaField, SwitchField, TextField } from './fields'
import { idOf, isUrl, isWhole, ORDER_ERROR, payload, toNumber } from './helpers'

interface Props { entity: Subject | null; onRefresh: () => Promise<void> }

export function SubjectPanel({ entity, onRefresh }: Props) {
  const { can } = useExplorerAccess()
  const { open } = useActions()
  const { select } = usePanelSelection()
  const isEdit = !!entity

  const form = useEntityForm({
    id: 'subject',
    what: 'subject',
    label: (v) => v.name || 'New subject',
    readOnly: !can('subject', isEdit ? 'update' : 'create'),
    initial: () => ({
      name: entity?.name ?? '',
      description: entity?.description ?? '',
      whatsapp_community_link: entity?.whatsapp_community_link ?? '',
      display_order: entity?.display_order?.toString() ?? '',
      is_active: entity?.is_active ?? true,
    }),
    validate: (v) => ({
      ...(v.name.trim().length < 2 ? { name: 'Use at least 2 characters.' } : v.name.trim().length > 100 ? { name: 'Use at most 100 characters.' } : {}),
      ...(v.description.trim().length < 10 && (!isEdit || v.description.trim() !== (entity?.description ?? '').trim()) ? { description: 'Use at least 10 characters.' } : v.description.length > 500 ? { description: 'Use at most 500 characters.' } : {}),
      ...(v.whatsapp_community_link.trim() && !isUrl(v.whatsapp_community_link.trim()) ? { whatsapp_community_link: 'Use a full link starting with https://' } : {}),
      ...(!isWhole(v.display_order) ? { display_order: ORDER_ERROR } : {}),
    }),
    submit: (v, changed) => {
      const convert = { name: (x: string) => x.trim(), description: (x: string) => x.trim(), whatsapp_community_link: (x: string) => x.trim() || undefined, display_order: toNumber }
      const data = payload<typeof v>(isEdit ? changed : v, convert) as unknown as SubjectFormData
      return isEdit ? subjectsService.updateSubject(entity._id, data) : subjectsService.createSubject(data)
    },
    onSaved: async (result) => {
      await onRefresh()
      const id = idOf(result)
      if (!isEdit && id) select('subject', id)
    },
    savedMessage: (v) => (isEdit ? `"${v.name}" saved` : `"${v.name}" created`),
  })
  const v = form.values

  return (
    <PanelShell
      icon={<Thumb src={entity?.icon_url} fallback={initials(v.name || 'S')} />}
      title={isEdit ? v.name || 'Subject' : 'New subject'}
      subtitle={isEdit ? `Subject${entity.package_count != null ? ` · ${plural(entity.package_count, 'package')}` : ''}` : 'The top level: packages go inside it'}
      badges={isEdit ? <ActiveBadge active={entity.is_active} /> : undefined}
      headerActions={isEdit && (
        <EntityHeaderActions
          kind="subject"
          id={entity._id}
          name={entity.name}
          data={entity}
          idLabel="Subject ID"
          extra={can('subject', 'delete') && (
            <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => open({ type: 'deleteSubject', id: entity._id, name: entity.name })}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete subject
            </DropdownMenuItem>
          )}
        />
      )}
      form={form}
      saveLabel={isEdit ? 'Save changes' : 'Create subject'}
      savingLabel={isEdit ? 'Saving…' : 'Creating…'}
    >
      <TextField form={form} name="name" label="Name" required placeholder="Cardiology" autoFocus={!isEdit} />
      <AreaField form={form} name="description" label="Description" required={!isEdit} hint="At least 10 characters." placeholder="What this subject covers" />
      <TextField form={form} name="whatsapp_community_link" label="WhatsApp community link" type="url" placeholder="https://chat.whatsapp.com/" />
      <TextField form={form} name="display_order" label="Display order" type="number" min={0} className="w-32" />
      <SwitchField form={form} name="is_active" label="Active" hint="Visible to students" />
    </PanelShell>
  )
}
