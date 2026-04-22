import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'

interface KeyboardHelpDialogProps {
  open: boolean
  onClose: () => void
}

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ['Esc'], description: 'Navigate up one level' },
  { keys: ['Backspace'], description: 'Navigate up one level' },
  { keys: ['⌘', 'K'], description: 'Focus the current-level search box' },
  { keys: ['?'], description: 'Open this help dialog' },
]

function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-medium border border-slate-200 shadow-[0_1px_0_0_var(--color-slate-300)] leading-none min-w-[20px]">
      {children}
    </kbd>
  )
}

export function KeyboardHelpDialog({ open, onClose }: KeyboardHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Keyboard className="w-4 h-4 text-slate-500" />
            </div>
            <DialogTitle className="text-sm font-semibold text-slate-800">Keyboard shortcuts</DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-5 py-4 space-y-2.5">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600">{description}</span>
              <div className="flex items-center gap-1 shrink-0">
                {keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-slate-400 text-xs">+</span>}
                    <Key>{k}</Key>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-4 pt-1">
          <p className="text-[11px] text-slate-400 text-center">
            Shortcuts are disabled when an input is focused
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
