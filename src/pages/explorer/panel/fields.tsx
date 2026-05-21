import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

/**
 * Notion/Obsidian-style field primitives for the detail panel. Light only.
 * Labels are small + muted; inputs are quiet until focused.
 */

export function PanelSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
      {children}
    </h3>
  )
}

export function PanelField({
  label,
  required,
  hint,
  children,
  htmlFor,
}: {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

export function PanelText({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
  className,
  autoFocus,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}) {
  return (
    <Input
      id={id}
      type={type}
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn('h-9 text-sm bg-slate-50/60 border-slate-200 focus-visible:bg-white', className)}
    />
  )
}

export function PanelTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
}) {
  return (
    <Textarea
      id={id}
      value={value}
      disabled={disabled}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm resize-none bg-slate-50/60 border-slate-200 focus-visible:bg-white"
    />
  )
}

export function PanelSwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50/60 ring-1 ring-slate-200 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

export function PanelSelect({
  id,
  value,
  onChange,
  disabled,
  children,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-slate-200 bg-slate-50/60 px-3 py-1 text-sm transition-colors focus-visible:bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
    >
      {children}
    </select>
  )
}
