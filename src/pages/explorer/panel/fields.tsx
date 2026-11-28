import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { EntityForm, FormValue } from '../hooks/useEntityForm'

// ── Plain pieces (used by dialogs too) ───────────────────────────────────

export function PanelSectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 group-data-[lead]:border-t-0 group-data-[lead]:pt-0">
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
      {action}
    </div>
  )
}

interface PanelFieldProps {
  label: string
  required?: boolean
  hint?: ReactNode
  error?: string
  htmlFor?: string
  children: ReactNode
}

export function PanelField({ label, required, hint, error, htmlFor, children }: PanelFieldProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </label>
      {children}
      {error
        ? <p id={htmlFor && `${htmlFor}-error`} className="text-xs text-danger">{error}</p>
        : hint && <p id={htmlFor && `${htmlFor}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

const describe = (id: string | undefined, error?: string, hint?: ReactNode) => (id ? (error ? `${id}-error` : hint ? `${id}-hint` : undefined) : undefined)

interface PanelTextProps {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
  className?: string
  autoFocus?: boolean
  invalid?: boolean
  required?: boolean
  describedBy?: string
  min?: number
}

export function PanelText({ id, value, onChange, placeholder, type = 'text', disabled, className, autoFocus, invalid, required, describedBy, min }: PanelTextProps) {
  return (
    <Input
      id={id}
      type={type}
      inputMode={type === 'number' ? 'decimal' : undefined}
      min={min}
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      aria-required={required || undefined}
      aria-describedby={describedBy}
      onChange={(e) => onChange(e.target.value)}
      // A stray scroll over a focused number field must not change it
      onWheel={type === 'number' ? (e) => e.currentTarget.blur() : undefined}
      className={cn('h-9 bg-card text-sm', type === 'number' && 'tabular-nums', invalid && 'border-danger', className)}
    />
  )
}

interface PanelTextareaProps extends Omit<PanelTextProps, 'type' | 'min'> { rows?: number }

export function PanelTextarea({ id, value, onChange, placeholder, rows = 3, disabled, invalid, required, describedBy }: PanelTextareaProps) {
  return (
    <Textarea
      id={id}
      value={value}
      disabled={disabled}
      rows={rows}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      aria-required={required || undefined}
      aria-describedby={describedBy}
      onChange={(e) => onChange(e.target.value)}
      className={cn('resize-y bg-card text-sm', invalid && 'border-danger')}
    />
  )
}

interface PanelSelectProps {
  id?: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  children: ReactNode
}

export function PanelSelect({ id, value, onChange, disabled, invalid, describedBy, children }: PanelSelectProps) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(e) => onChange(e.target.value)}
      className={cn('flex h-9 w-full min-w-0 rounded-md border border-input bg-card px-2.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60', invalid && 'border-danger')}
    >
      {children}
    </select>
  )
}

interface PanelSwitchRowProps { id?: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }

export function PanelSwitchRow({ id, label, hint, checked, onChange, disabled }: PanelSwitchRowProps) {
  const name = id ?? `sw-${label.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <div className="min-w-0">
        <label htmlFor={name} className="block text-sm font-medium text-foreground">{label}</label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={name} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

// ── Fields bound to a form ───────────────────────────────────────────────

type Values = Record<string, FormValue>
type Bound<T extends Values> = { form: EntityForm<T>; name: keyof T & string; label: string; required?: boolean; hint?: ReactNode; disabled?: boolean }

export function TextField<T extends Values>({ form, name, label, required, hint, ...rest }: Bound<T> & Pick<PanelTextProps, 'type' | 'placeholder' | 'className' | 'autoFocus' | 'min'>) {
  const id = `${form.id}-${name}`
  const error = form.errors[name]
  return (
    <PanelField label={label} required={required} hint={hint} error={error} htmlFor={id}>
      <PanelText id={id} value={String(form.values[name] ?? '')} onChange={(v) => form.set(name, v as T[typeof name])} invalid={!!error} required={required} describedBy={describe(id, error, hint)} {...rest} />
    </PanelField>
  )
}

export function AreaField<T extends Values>({ form, name, label, required, hint, ...rest }: Bound<T> & Pick<PanelTextareaProps, 'placeholder' | 'rows'>) {
  const id = `${form.id}-${name}`
  const error = form.errors[name]
  return (
    <PanelField label={label} required={required} hint={hint} error={error} htmlFor={id}>
      <PanelTextarea id={id} value={String(form.values[name] ?? '')} onChange={(v) => form.set(name, v as T[typeof name])} invalid={!!error} required={required} describedBy={describe(id, error, hint)} {...rest} />
    </PanelField>
  )
}

export function SelectField<T extends Values>({ form, name, label, required, hint, children, disabled }: Bound<T> & { children: ReactNode }) {
  const id = `${form.id}-${name}`
  const error = form.errors[name]
  return (
    <PanelField label={label} required={required} hint={hint} error={error} htmlFor={id}>
      <PanelSelect id={id} value={String(form.values[name] ?? '')} onChange={(v) => form.set(name, v as T[typeof name])} disabled={disabled} invalid={!!error} describedBy={describe(id, error, hint)}>{children}</PanelSelect>
    </PanelField>
  )
}

export function SwitchField<T extends Values>({ form, name, label, hint, disabled }: Omit<Bound<T>, 'hint'> & { hint?: string }) {
  return <PanelSwitchRow id={`${form.id}-${name}`} label={label} hint={hint} disabled={disabled} checked={!!form.values[name]} onChange={(v) => form.set(name, v as T[typeof name])} />
}
