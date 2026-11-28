import { useMemo } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CopyButton } from '@/components/common/detail'

interface RawJsonDrawerProps { open: boolean; onClose: () => void; label: string; data: unknown }

/** The record exactly as the server returned it. */
export function RawJsonDrawer({ open, onClose, label, data }: RawJsonDrawerProps) {
  const json = useMemo(() => (open ? JSON.stringify(data, null, 2) : ''), [open, data])
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="flex w-full flex-col bg-card p-0 sm:max-w-lg">
        <SheetHeader className="space-y-0 border-b border-border py-4 pl-5 pr-12 text-left">
          <SheetTitle className="flex items-center gap-2 text-base"><span className="min-w-0 truncate">Raw JSON: {label}</span><CopyButton value={json} label="JSON" /></SheetTitle>
          <SheetDescription className="text-xs">Read only. For support and debugging.</SheetDescription>
        </SheetHeader>
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all p-5 font-mono text-xs leading-relaxed text-foreground">{json}</pre>
      </SheetContent>
    </Sheet>
  )
}
