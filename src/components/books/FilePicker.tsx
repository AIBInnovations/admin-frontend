import { useId, useState, type DragEvent } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatBytes } from './bookDisplay'

interface FilePickerProps {
  accept: string
  /** e.g. "Click to select e-book file" */
  title: string
  hint: string
  maxBytes: number
  file: File | null
  onPick: (file: File | null) => void
  onError: (message: string) => void
  disabled?: boolean
  /** 0-100 while uploading, null otherwise. */
  progress?: number | null
  /** What happens at 100%. */
  finishing?: string
  onCancel?: () => void
}

/** Choose a file, see it, and watch it upload. */
export function FilePicker({ accept, title, hint, maxBytes, file, onPick, onError, disabled, progress = null, finishing = 'Checking the file…', onCancel }: FilePickerProps) {
  const id = useId()
  const [over, setOver] = useState(false)
  const uploading = progress !== null

  const take = (next: File | null | undefined) => {
    if (!next) return
    if (next.size === 0) return onError('This file is empty.')
    if (next.size > maxBytes) return onError(`This file is ${formatBytes(next.size)}; the limit is ${formatBytes(maxBytes)}.`)
    onPick(next)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (!disabled) take(e.dataTransfer.files?.[0])
  }

  if (file) {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-3">
          <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          {uploading
            ? onCancel && <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel upload</Button>
            : <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPick(null)} disabled={disabled} aria-label={`Remove ${file.name}`}><X className="h-4 w-4" /></Button>}
        </div>
        {uploading && (
          <div className="mt-3 space-y-1.5">
            <Progress value={progress} className="h-2" aria-label="Upload progress" />
            <p className="flex justify-between text-xs text-muted-foreground" aria-live="polite">
              <span>{progress < 100 ? 'Uploading…' : finishing}</span>
              <span className="tabular-nums">{progress}%</span>
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 hover:border-primary/50 hover:bg-muted/50',
        over && 'border-primary bg-accent',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <Upload aria-hidden="true" className="h-6 w-6 text-muted-foreground" />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <input
        id={id}
        type="file"
        className="sr-only"
        accept={accept}
        disabled={disabled}
        onChange={(e) => { take(e.target.files?.[0]); e.target.value = '' }}
      />
    </label>
  )
}
