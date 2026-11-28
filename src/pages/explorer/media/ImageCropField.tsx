import { useCallback, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { getCroppedFile, type PixelCrop } from './cropImage'

interface ImageCropFieldProps {
  label: string
  /** Current image URL (already uploaded), if any. */
  value?: string | null
  /** Fixed crop ratio, e.g. 16/9 or 1. */
  aspect: number
  /** Helper/description text under the label. */
  hint?: string
  disabled?: boolean
  uploading?: boolean
  uploadProgress?: number
  /** Called with the cropped JPEG; the caller performs the actual upload. */
  onUpload: (file: File) => void | Promise<void>
  /** When provided, a remove control is shown. */
  onRemove?: () => void | Promise<void>
  /** Tailwind aspect helper for the preview box. */
  previewClassName?: string
}

const MAX_BYTES = 5 * 1024 * 1024 // 5MB, matches legacy thumbnail limit

/** Image with fixed-ratio cropping before the upload. */
export function ImageCropField({
  label,
  value,
  aspect,
  hint,
  disabled,
  uploading,
  uploadProgress,
  onUpload,
  onRemove,
  previewClassName = 'aspect-video',
}: ImageCropFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rawSrc, setRawSrc] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [pixels, setPixels] = useState<PixelCrop | null>(null)
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [broken, setBroken] = useState<string | null>(null)

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setProblem('Use a JPEG, PNG or WebP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setProblem('The image must be 5 MB or smaller.')
      return
    }
    setProblem(null)
    const reader = new FileReader()
    reader.onload = () => {
      setRawSrc(reader.result as string)
      setZoom(1)
      setCrop({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
  }

  const onCropComplete = useCallback((_area: unknown, areaPixels: PixelCrop) => {
    setPixels(areaPixels)
  }, [])

  const confirmCrop = async () => {
    if (!rawSrc || !pixels) return
    setSaving(true)
    try {
      const file = await getCroppedFile(rawSrc, pixels)
      await onUpload(file)
      setRawSrc(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        {value && onRemove && !disabled && (
          <button type="button" onClick={() => void onRemove()} disabled={uploading} className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground transition-colors hover:text-danger disabled:opacity-50">
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" /> Remove
          </button>
        )}
      </div>

      <div className={`relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted ${previewClassName}`}>
        {value && broken !== value
          ? <img src={value} alt="" onError={() => setBroken(value)} className="h-full w-full object-cover" />
          : <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground"><ImageIcon aria-hidden="true" className="h-5 w-5" />{value ? 'The image could not be loaded' : 'No image'}</span>}
        {uploading && (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-card/80 text-xs text-foreground">
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{uploadProgress ? `${uploadProgress}%` : 'Uploading'}
          </div>
        )}
      </div>

      {problem ? <p role="alert" className="text-xs text-danger">{problem}</p> : hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {!disabled && (
        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> {value ? 'Replace image' : 'Upload image'}
        </Button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" tabIndex={-1} aria-hidden="true" onChange={onPick} />

      <Dialog variant="modal" open={!!rawSrc} onOpenChange={(v) => !v && !saving && setRawSrc(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Crop image</DialogTitle>
          </DialogHeader>
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-ink">
            {rawSrc && <Cropper image={rawSrc} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />}
          </div>
          <div className="px-1 pt-2">
            <span className="text-xs text-muted-foreground">Zoom</span>
            <Slider aria-label="Zoom" value={[zoom]} min={1} max={3} step={0.01} onValueChange={(v) => setZoom(v[0])} className="mt-1.5" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRawSrc(null)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void confirmCrop()} disabled={saving || !pixels}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : 'Apply and upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
