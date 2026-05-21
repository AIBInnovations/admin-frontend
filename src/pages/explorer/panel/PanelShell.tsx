import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, X } from 'lucide-react'

interface PanelShellProps {
  icon?: ReactNode
  title: string
  subtitle?: ReactNode
  /** Status badges rendered next to the title. */
  badges?: ReactNode
  /** Right-aligned header controls (active toggle, menu, …). */
  headerActions?: ReactNode
  /** Scrollable field body. */
  children: ReactNode
  /** Close (X) handler — collapses the panel / clears manual selection. */
  onClose?: () => void

  // Default footer (omitted if onSave not provided)
  dirty?: boolean
  saving?: boolean
  canSave?: boolean
  saveLabel?: string
  onSave?: () => void
  onCancel?: () => void
}

/** Chrome for an entity editor: header + scroll body + sticky save footer. */
export function PanelShell({
  icon,
  title,
  subtitle,
  badges,
  headerActions,
  children,
  onClose,
  dirty,
  saving,
  canSave = true,
  saveLabel = 'Save',
  onSave,
  onCancel,
}: PanelShellProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-start gap-2.5">
          {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-slate-900 truncate">{title}</h2>
              {badges}
            </div>
            {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {headerActions}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">{children}</div>

      {/* Footer */}
      {onSave && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2 bg-white">
          <span className="text-xs text-slate-400">
            {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving || !dirty}>
                Discard
              </Button>
            )}
            <Button size="sm" onClick={onSave} disabled={saving || !canSave || !dirty}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…</> : saveLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
