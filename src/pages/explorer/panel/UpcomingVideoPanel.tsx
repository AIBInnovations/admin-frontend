import { Clock } from 'lucide-react'
import { videosService } from '@/services/videos.service'
import { useExplorerAccess } from '../access'
import { usePanelSelection } from '../context/PanelSelectionContext'
import { useEntityForm } from '../hooks/useEntityForm'
import { Thumb } from '../ui/Thumb'
import { PanelShell } from './PanelShell'
import { AreaField, SelectField, SwitchField, TextField } from './fields'
import { idOf, isWhole, ORDER_ERROR } from './helpers'
import { localInputToIso } from './localTime'
import type { PanelContext } from './panelTypes'
import { useFaculty } from './useFaculty'

/** A placeholder for a video that is not ready yet. Students see its release date. */
export function UpcomingVideoPanel({ ctx, onRefresh }: { ctx?: PanelContext; onRefresh: () => Promise<void> }) {
  const { can } = useExplorerAccess()
  const { select } = usePanelSelection()
  const faculty = useFaculty()

  const form = useEntityForm({
    id: 'upcoming',
    what: 'video',
    label: (v) => v.title || 'New upcoming video',
    readOnly: !can('video', 'create'),
    initial: () => ({ title: '', description: '', scheduled_at: '', faculty_id: '', is_free: false, display_order: '1' }),
    validate: (v) => {
      const iso = localInputToIso(v.scheduled_at)
      return {
        ...(v.title.trim().length < 2 ? { title: 'Use at least 2 characters.' } : v.title.trim().length > 200 ? { title: 'Use at most 200 characters.' } : {}),
        ...(v.description.length > 2000 ? { description: 'Use at most 2,000 characters.' } : {}),
        ...(!iso ? { scheduled_at: 'Choose a date and time.' } : new Date(iso) <= new Date() ? { scheduled_at: 'Choose a time in the future.' } : {}),
        ...(!isWhole(v.display_order) ? { display_order: ORDER_ERROR } : {}),
      }
    },
    submit: (v) => videosService.createUpcoming({
      title: v.title.trim(),
      description: v.description.trim(),
      module_id: ctx?.moduleId ?? '',
      faculty_id: v.faculty_id || undefined,
      is_free: v.is_free,
      display_order: Number(v.display_order) || 1,
      scheduled_release_at: localInputToIso(v.scheduled_at)!,
    }),
    onSaved: async (result) => {
      await onRefresh()
      const id = idOf(result)
      if (id) select('video', id)
    },
    savedMessage: (v) => `"${v.title}" added as upcoming`,
  })

  return (
    <PanelShell
      icon={<Thumb fallback={<Clock className="h-4 w-4" />} />}
      title="New upcoming video"
      subtitle="A placeholder: students see when it will be released"
      form={form}
      saveLabel="Create upcoming video"
      savingLabel="Creating…"
    >
      <TextField form={form} name="title" label="Title" required placeholder="Lecture title" autoFocus />
      <AreaField form={form} name="description" label="Description" placeholder="Brief description" />
      <TextField form={form} name="scheduled_at" label="Release date (IST)" required type="datetime-local" />
      <SelectField form={form} name="faculty_id" label="Faculty">
        <option value="">None</option>
        {faculty.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
      </SelectField>
      <TextField form={form} name="display_order" label="Display order" type="number" min={0} className="w-32" />
      <SwitchField form={form} name="is_free" label="Free access" hint="No purchase needed" />
    </PanelShell>
  )
}
