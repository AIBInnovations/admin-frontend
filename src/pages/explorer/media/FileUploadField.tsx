import { useId, useRef, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface FileUploadFieldProps {
  label: string
  /** Accept attribute, e.g. ".pdf,.epub" or "video/mp4". */
  accept: string
  /** Larger files are refused before anything is sent. */
  maxMb: number
  buttonLabel?: string
  hint?: string
  error?: string
  disabled?: boolean
  uploading?: boolean
  uploadProgress?: number
  /** Called with the chosen file; the caller uploads it. */
  onPick: (file: File) => void | Promise<void>
}

function matches(file: File, accept: string): boolean {
  return accept.split(',').some((a) => {
    const rule = a.trim().toLowerCase()
    return rule.startsWith('.') ? file.name.toLowerCase().endsWith(rule) : file.type.toLowerCase() === rule
  })
}

export function FileUploadField({ label, accept, maxMb, buttonLabel, hint, error, disabled, uploading, uploadProgress, onPick }: FileUploadFieldProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const message = problem ?? error

  const pick = (file: File | undefined) => {
    if (!file) return
    if (file.size === 0) return setProblem('This file is empty.')
    if (file.size > maxMb * 1024 * 1024) return setProblem(`This file is too large. The limit is ${maxMb >= 1024 ? `${maxMb / 1024} GB` : `${maxMb} MB`}.`)
    // Some systems report no type; the server checks again
    if (file.type && !matches(file, accept) && !accept.includes('.')) return setProblem('This kind of file is not accepted here.')
    setProblem(null)
    void onPick(file)
  }

  return (
    <div className="space-y-1.5">
      <span id={id} className="block text-[13px] font-medium text-foreground">{label}</span>
      <Button type="button" size="sm" variant="outline" aria-describedby={id} disabled={disabled || uploading} onClick={() => input.current?.click()} className="max-w-full">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
        <span className="min-w-0 truncate">{uploading ? `Uploading ${uploadProgress ?? 0}%` : buttonLabel ?? 'Choose file'}</span>
      </Button>
      <input ref={input} type="file" accept={accept} className="hidden" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; pick(f) }} />
      {uploading && <Progress value={uploadProgress ?? 0} aria-label={`${label} upload`} className="h-1.5" />}
      {message ? <p role="alert" className="text-xs text-danger">{message}</p> : hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
