import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const MOD = isMac ? 'Cmd' : 'Ctrl'

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ['/'], description: 'Find anything by name' },
  { keys: [MOD, 'S'], description: 'Save the open form' },
  { keys: ['Esc'], description: 'Close the open item, or go up one level (when nothing is unsaved)' },
  { keys: ['Space'], description: 'On a drag handle: pick up, then arrow keys to move, Space to drop' },
  { keys: ['?'], description: 'Show these shortcuts' },
]

export function KeyboardHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog variant="dock" open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>They do not run while you are typing in a field, except save.</DialogDescription>
        </DialogHeader>
        <dl className="space-y-2.5 pb-1">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-foreground">{description}</dt>
              <dd className="flex shrink-0 items-center gap-1">
                {keys.map((k) => <kbd key={k} className="min-w-6 rounded border border-border bg-muted px-1.5 py-0.5 text-center font-mono text-xs text-foreground">{k}</kbd>)}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
