import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Braces, Copy, MoreHorizontal, Trash2 } from 'lucide-react'
import { PanelShell } from './PanelShell'
import { PanelField, PanelSwitchRow, PanelText, PanelTextarea } from './fields'
import { ActiveBadge } from '../ui/StatusBadge'
import { RawJsonDrawer } from '../components/popovers/RawJsonDrawer'
import { DeleteSubjectDialog } from '../dialogs/DeleteSubjectDialog'
import { usePanelForm } from '../hooks/usePanelForm'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { copyText } from '../copyShareLink'
import { EXPLORER_BASE } from '../parseExplorerPath'
import { subjectsService, type Subject, type SubjectDetail } from '@/services/subjects.service'

interface SubjectPanelProps {
  entity: Subject | SubjectDetail | null
  onRefresh?: () => void
  onClose?: () => void
}

export function SubjectPanel({ entity, onRefresh, onClose }: SubjectPanelProps) {
  const navigate = useNavigate()
  const isEdit = !!entity
  const [rawOpen, setRawOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const form = usePanelForm(
    () => ({
      name: entity?.name ?? '',
      description: entity?.description ?? '',
      whatsapp_community_link: entity?.whatsapp_community_link ?? '',
      display_order: entity?.display_order?.toString() ?? '',
      is_active: entity?.is_active ?? true,
    }),
    entity?._id ?? 'new-subject',
  )
  const v = form.values

  const save = useExplorerMutation({
    name: isEdit ? 'Update subject' : 'Create subject',
    fn: () => {
      const data = {
        name: v.name.trim(),
        description: v.description.trim() || undefined,
        whatsapp_community_link: v.whatsapp_community_link.trim() || undefined,
        display_order: v.display_order ? Number(v.display_order) : undefined,
        is_active: v.is_active,
      }
      return isEdit
        ? subjectsService.updateSubject(entity!._id, data)
        : subjectsService.createSubject(data)
    },
    onSuccess: () => { form.commit(v); onRefresh?.(); if (!isEdit) onClose?.() },
    successMessage: isEdit ? 'Subject updated' : 'Subject created',
  })

  const valid = v.name.trim().length > 0

  return (
    <PanelShell
      icon={
        <Avatar className="w-9 h-9 rounded-lg">
          {entity?.icon_url && <AvatarImage src={entity.icon_url} alt={v.name} />}
          <AvatarFallback className="rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">
            {(v.name || 'S').slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      }
      title={isEdit ? v.name || 'Subject' : 'New subject'}
      subtitle={isEdit ? 'Subject' : 'Create a new subject'}
      badges={isEdit ? <ActiveBadge active={entity!.is_active} /> : undefined}
      headerActions={
        isEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => copyText(entity!._id, 'Subject ID')}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Copy ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRawOpen(true)}>
                <Braces className="w-3.5 h-3.5 mr-2" /> View raw JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete subject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
      onClose={onClose}
      dirty={form.dirty}
      saving={save.loading}
      canSave={valid}
      saveLabel={isEdit ? 'Save changes' : 'Create subject'}
      onSave={save.execute}
      onCancel={form.reset}
    >
      <PanelField label="Name" required htmlFor="sp-name">
        <PanelText id="sp-name" value={v.name} onChange={(x) => form.set('name', x)} placeholder="e.g. Cardiology" autoFocus={!isEdit} />
      </PanelField>

      <PanelField label="Description" htmlFor="sp-desc">
        <PanelTextarea id="sp-desc" value={v.description} onChange={(x) => form.set('description', x)} placeholder="Brief description of this subject…" />
      </PanelField>

      <PanelField label="WhatsApp community link" htmlFor="sp-wa">
        <PanelText id="sp-wa" type="url" value={v.whatsapp_community_link} onChange={(x) => form.set('whatsapp_community_link', x)} placeholder="https://chat.whatsapp.com/…" />
      </PanelField>

      <PanelField label="Display order" htmlFor="sp-order">
        <PanelText id="sp-order" type="number" value={v.display_order} onChange={(x) => form.set('display_order', x)} placeholder="e.g. 1" className="w-32" />
      </PanelField>

      <PanelSwitchRow
        label="Active"
        hint="Visible to students"
        checked={v.is_active}
        onChange={(x) => form.set('is_active', x)}
      />

      {entity && (
        <RawJsonDrawer open={rawOpen} onClose={() => setRawOpen(false)} label={v.name} data={entity} />
      )}
      {entity && (
        <DeleteSubjectDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onSuccess={() => { setDeleteOpen(false); onClose?.(); navigate(EXPLORER_BASE, { replace: true }); onRefresh?.() }}
          subjectId={entity._id}
          subjectName={entity.name}
        />
      )}
    </PanelShell>
  )
}
