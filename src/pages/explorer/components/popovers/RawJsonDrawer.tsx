import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

interface RawJsonDrawerProps {
  open: boolean
  onClose: () => void
  label: string
  data: unknown
}

export function RawJsonDrawer({ open, onClose, label, data }: RawJsonDrawerProps) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)

  function handleCopy() {
    navigator.clipboard.writeText(json).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-sm font-semibold text-slate-800">
            Raw JSON — {label}
          </SheetTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            onClick={handleCopy}
          >
            {copied
              ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</>
              : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </Button>
        </SheetHeader>
        <div className="flex-1 overflow-auto p-5">
          <pre className="text-[11px] leading-relaxed font-mono text-slate-700 whitespace-pre-wrap break-all">
            {json}
          </pre>
        </div>
      </SheetContent>
    </Sheet>
  )
}
