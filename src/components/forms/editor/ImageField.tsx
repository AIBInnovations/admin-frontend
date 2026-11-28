import { useEffect, useId, useRef, useState } from 'react'
import { ImageOff, RefreshCw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { FileUpload } from '@/components/common/FileUpload'
import { ImageCropper } from '@/components/common/ImageCropper'

export interface ImageValue { file: File | null; url: string | null; key: string | null }
export const NO_IMAGE: ImageValue = { file: null, url: null, key: null }

const ACCEPT = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }

interface ImageFieldProps {
  label: string
  required?: boolean
  value: ImageValue
  onChange: (v: ImageValue) => void
  aspect: number
  maxMb?: number
  hint?: string
  error?: string
  uploadLabel: string
  cropTitle: string
  cropDescription?: string
  /** 0 to 100 while uploading. */
  progress?: number | null
  disabled?: boolean
  /** Skip the crop step (the picture is used as it is). */
  noCrop?: boolean
  className?: string
  previewClassName?: string
}

/** Shows the current picture, lets the admin replace, crop or remove it. Nothing is uploaded until the form is saved. */
export function ImageField({ label, required, value, onChange, aspect, maxMb = 5, hint, error, uploadLabel, cropTitle, cropDescription, progress = null, disabled, noCrop, className, previewClassName }: ImageFieldProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [cropping, setCropping] = useState<File | null>(null)
  const [pickError, setPickError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setBroken(false)
    if (!value.file) { setPreview(value.url); return }
    const url = URL.createObjectURL(value.file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [value.file, value.url])

  const take = (file: File | undefined) => {
    if (!file) return
    if (!Object.keys(ACCEPT).includes(file.type)) { setPickError('Use a JPEG, PNG or WebP image.'); return }
    if (file.size > maxMb * 1024 * 1024) { setPickError(`This file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${maxMb} MB.`); return }
    setPickError(null)
    if (noCrop) onChange({ ...value, file })
    else setCropping(file)
  }

  const shown = !!preview
  const message = error || pickError
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label className="block text-[13px] font-medium" id={`${id}-label`}>
        {label}{required && <><span className="text-danger" aria-hidden="true"> *</span><span className="sr-only"> (required)</span></>}
      </Label>
      <div role="group" aria-labelledby={`${id}-label`} tabIndex={message ? -1 : undefined} aria-invalid={message ? true : undefined} className="outline-none">
        {shown ? (
          <div className={cn('max-w-[420px] overflow-hidden rounded-md border bg-muted', error ? 'border-danger' : 'border-border', previewClassName)}>
            <div style={{ aspectRatio: String(aspect) }} className="flex w-full items-center justify-center">
              {broken
                ? <p className="flex items-center gap-2 px-4 text-[13px] text-muted-foreground"><ImageOff aria-hidden="true" className="h-4 w-4" />The picture could not be loaded</p>
                : <img src={preview!} alt={`${label} preview`} className="h-full w-full object-cover" onError={() => setBroken(true)} />}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">{value.file ? 'New picture, uploaded when you save' : 'Current picture'}</p>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => input.current?.click()}><RefreshCw />Replace</Button>
                <Button type="button" variant="ghost" size="sm" disabled={disabled} className="text-danger hover:text-danger" onClick={() => onChange(value.file ? { ...value, file: null } : NO_IMAGE)}><Trash2 />Remove</Button>
              </div>
            </div>
          </div>
        ) : (
          <FileUpload
            accept={ACCEPT}
            maxFiles={1}
            maxSize={maxMb * 1024 * 1024}
            value={[]}
            onChange={(files) => take(files[0])}
            disabled={disabled}
            label={uploadLabel}
            description={hint ?? `JPEG, PNG, or WebP. Max ${maxMb}MB.`}
            className="max-w-[420px]"
          />
        )}
        <input ref={input} type="file" accept={Object.keys(ACCEPT).join(',')} className="hidden" tabIndex={-1} aria-hidden="true" onChange={(e) => { take(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      {progress !== null && (
        <div className="max-w-[420px] space-y-1" role="status">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">Uploading {progress}%</p>
        </div>
      )}
      {message && <p className="text-[13px] text-danger">{message}</p>}
      {!noCrop && (
        <ImageCropper
          file={cropping}
          open={!!cropping}
          aspectRatio={aspect}
          title={cropTitle}
          description={cropDescription}
          onClose={() => setCropping(null)}
          onCropComplete={(file) => { onChange({ ...value, file }); setCropping(null) }}
        />
      )}
    </div>
  )
}
