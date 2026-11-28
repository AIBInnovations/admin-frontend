import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const STYLE = {
  danger: { box: 'border-danger/30 bg-danger-soft', text: 'text-danger', icon: AlertCircle },
  warning: { box: 'border-warning/30 bg-warning-soft', text: 'text-warning', icon: Info },
  success: { box: 'border-success/30 bg-success-soft', text: 'text-success', icon: CheckCircle2 },
} as const

export function ImpactBox({ tone, title, children }: { tone: keyof typeof STYLE; title?: ReactNode; children?: ReactNode }) {
  const { box, text, icon: Icon } = STYLE[tone]
  return (
    <div className={cn('flex items-start gap-2.5 rounded-lg border p-3 text-sm', box)}>
      <Icon aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0', text)} />
      <div className="min-w-0 flex-1 space-y-1.5">
        {title && <p className={cn('font-medium', text)}>{title}</p>}
        {children && <div className="text-foreground/80">{children}</div>}
      </div>
    </div>
  )
}

export function Checking({ children }: { children: ReactNode }) {
  return <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />{children}</p>
}
