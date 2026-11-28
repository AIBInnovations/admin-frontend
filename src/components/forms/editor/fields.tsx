import { forwardRef, type ReactNode } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface ControlProps {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
  'aria-required'?: true
}

interface FieldProps {
  id: string
  label: ReactNode
  required?: boolean
  hint?: ReactNode
  error?: string
  counter?: { value: number; max: number }
  className?: string
  children: (control: ControlProps) => ReactNode
}

/** One labelled control: label, hint and error tied to it for screen readers. */
export function Field({ id, label, required, hint, error, counter, className, children }: FieldProps) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  const over = counter && counter.value > counter.max
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-[13px] font-medium leading-snug">
          {label}
          {required && <span className="text-danger" aria-hidden="true"> *</span>}
          {required && <span className="sr-only"> (required)</span>}
        </Label>
        {counter && counter.value > counter.max * 0.8 && (
          <span className={cn('shrink-0 text-xs tabular-nums', over ? 'text-danger' : 'text-muted-foreground')}>{counter.value} / {counter.max}</span>
        )}
      </div>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, 'aria-required': required ? true : undefined })}
      {error && <p id={`${id}-error`} className="text-[13px] text-danger">{error}</p>}
      {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Text inputs on a white card. */
export const TextInput = forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, ...props }, ref) => (
  <Input ref={ref} autoComplete="off" className={cn('bg-card aria-invalid:border-danger', className)} {...props} />
))
TextInput.displayName = 'TextInput'

/** A number with a unit on its left (₹) or right (seats). */
export const UnitInput = forwardRef<HTMLInputElement, React.ComponentProps<'input'> & { prefix?: string; suffix?: string }>(
  ({ prefix, suffix, className, ...props }, ref) => (
    <div className="relative">
      {prefix && <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
      <Input
        ref={ref}
        type="number"
        autoComplete="off"
        inputMode="decimal"
        className={cn('bg-card tabular-nums aria-invalid:border-danger', prefix && 'pl-7', suffix && 'pr-16', className)}
        {...props}
      />
      {suffix && <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">{suffix}</span>}
    </div>
  ),
)
UnitInput.displayName = 'UnitInput'

export interface Choice { value: string; label: string; hint?: string }

interface SelectControlProps {
  control: ControlProps
  value: string
  onChange: (value: string) => void
  choices: Choice[]
  placeholder?: string
  disabled?: boolean
}

export function SelectControl({ control, value, onChange, choices, placeholder, disabled }: SelectControlProps) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="bg-card aria-invalid:border-danger" {...control}>
        <SelectValue placeholder={placeholder ?? 'Choose one'} />
      </SelectTrigger>
      <SelectContent>
        {choices.map((c) => (
          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface SwitchRowProps {
  id: string
  label: string
  description?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function SwitchRow({ id, label, description, checked, onChange, disabled }: SwitchRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border px-3.5 py-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        {description && <p id={`${id}-hint`} className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} aria-describedby={description ? `${id}-hint` : undefined} checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5" />
    </div>
  )
}

/** A short message inside a form or page. */
export function Note({ tone = 'info', children, className }: { tone?: 'info' | 'warning' | 'danger'; children: ReactNode; className?: string }) {
  const Icon = tone === 'info' ? Info : AlertTriangle
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex gap-2.5 rounded-md px-3.5 py-2.5 text-[13px] leading-relaxed',
        tone === 'info' && 'bg-accent text-accent-foreground',
        tone === 'warning' && 'bg-warning-soft text-warning',
        tone === 'danger' && 'bg-danger-soft text-danger',
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
