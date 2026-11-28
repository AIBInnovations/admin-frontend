import type { ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FormState } from '../hooks/useEntityForm'
import { usePanelSelection } from '../context/PanelSelectionContext'
import { useCompact } from '../context/CompactContext'

interface PanelShellProps {
  icon?: ReactNode
  title: string
  subtitle?: ReactNode
  badges?: ReactNode
  headerActions?: ReactNode
  children: ReactNode
  /** The form this panel edits. Without one the panel is read-only. */
  form?: FormState
  saveLabel?: string
  savingLabel?: string
}

/** Chrome of the docked editor: header, scrolling body, save bar that stays in view. */
export function PanelShell({ icon, title, subtitle, badges, headerActions, children, form, saveLabel = 'Save changes', savingLabel = 'Saving…' }: PanelShellProps) {
  const { manual, clear } = usePanelSelection()
  const compact = useCompact()
  const editable = !!form && !form.readOnly

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-start gap-3 border-b border-border px-4 py-3">
        {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
        <div className="min-w-0 flex-1">
          <h2 title={title} className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          {badges && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{badges}</div>}
        </div>
        <div className="-mr-1.5 flex shrink-0 items-center gap-0.5">
          {headerActions}
          {(manual || compact) && (
            <Button variant="ghost" size="icon" aria-label="Close editor" className="h-8 w-8 text-muted-foreground" onClick={clear}><X className="h-4 w-4" /></Button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <fieldset disabled={form?.readOnly || form?.saving} className="min-w-0 space-y-5 px-4 py-4">
          {form?.readOnly && <p className="rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">You can look at this but not change it.</p>}
          {children}
        </fieldset>
      </div>

      {editable && <SaveBar form={form} saveLabel={saveLabel} savingLabel={savingLabel} />}
    </div>
  )
}

function SaveBar({ form, saveLabel, savingLabel }: { form: FormState; saveLabel: string; savingLabel: string }) {
  const { asking, answer, handle } = usePanelSelection()

  if (asking) {
    return (
      <div role="alertdialog" aria-labelledby="explorer-unsaved" className="pg-dock shrink-0 space-y-2.5 border-t border-warning/40 bg-warning-soft px-4 py-3">
        <p id="explorer-unsaved" className="text-sm text-foreground"><strong className="font-semibold">Save or discard?</strong> {handle?.label ? <>You have unsaved edits in <span className="break-words font-medium">{handle.label}</span>.</> : 'You have unsaved edits.'}</p>
        {form.error && <p role="alert" className="text-sm text-danger">{form.error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void answer('save')} disabled={form.saving} autoFocus>{form.saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {savingLabel}</> : 'Save and continue'}</Button>
          <Button size="sm" variant="outline" className="bg-card" onClick={() => void answer('discard')} disabled={form.saving}>Discard edits</Button>
          <Button size="sm" variant="ghost" onClick={() => void answer('keep')} disabled={form.saving}>Keep editing</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="shrink-0 border-t border-border bg-card px-4 py-3">
      {form.error && <p role="alert" className="mb-2.5 break-words rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">{form.error.replace(/\.?$/, '.')} Nothing you typed was lost.</p>}
      <div className="flex items-center justify-between gap-2">
        <span aria-live="polite" className="min-w-0 text-xs text-muted-foreground">{form.saving ? savingLabel : form.dirty ? 'Unsaved changes' : 'No unsaved changes'}</span>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={form.reset} disabled={form.saving || !form.dirty}>Discard</Button>
          <Button size="sm" onClick={() => void form.save()} disabled={form.saving || !form.dirty}>
            {form.saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {savingLabel}</> : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
