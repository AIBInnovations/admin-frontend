import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { FileUp, Loader2 } from 'lucide-react'

interface FileUploadFieldProps {
  label: string
  /** Accept attribute, e.g. ".pdf,.epub" or "application/pdf". */
  accept: string
  /** Max size in MB; rejected client-side. */
  maxMb: number
  buttonLabel?: string
  hint?: string
  disabled?: boolean
  uploading?: boolean
  uploadProgress?: number
  /** Called with the chosen file; the caller performs the actual upload. */
  onPick: (file: File) => void | Promise<void>
}

/**
 * Generic file picker with size guard + progress, styled for the Explorer.
 * Used for document files and book ebooks (PDF/EPUB).
 */
export function FileUploadField({
  label,
  accept,
  maxMb,
  buttonLabel,
  hint,
  disabled,
  uploading,
  uploadProgress,
  onPick,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > maxMb * 1024 * 1024) {
      window.alert(`File must be ${maxMb}MB or smaller.`)
      return
    }
    void onPick(file)
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 border-slate-200 text-slate-600 hover:bg-slate-50"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
          {buttonLabel ?? 'Choose file'}
        </Button>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handle} />
      </div>
      {uploading && <Progress value={uploadProgress ?? 0} className="h-1.5" />}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}
