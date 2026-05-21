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

/**
 * Notion/light-styled image field with fixed-ratio cropping. Built on
 * react-easy-crop; intentionally independent of the old `components/common`
 * cropper so the Explorer keeps its own styling.
 */
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

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      window.alert('Use a JPEG, PNG or WebP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      window.alert('Image must be 5MB or smaller.')
      return
    }
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
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        {value && onRemove && !disabled && (
          <button
            type="button"
            onClick={() => void onRemove()}
            className="text-xs text-slate-400 hover:text-red-500 inline-flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        )}
      </div>

      <div className={`relative w-full ${previewClassName} rounded-xl overflow-hidden bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center`}>
        {value ? (
          <img src={value} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-300">
            <ImageIcon className="w-6 h-6" />
            <span className="text-xs">No image</span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-1">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            <span className="text-xs text-slate-500">{uploadProgress ?? 0}%</span>
          </div>
        )}
      </div>

      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5 h-8 border-slate-200 text-slate-600 hover:bg-slate-50"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-3.5 h-3.5" />
        {value ? 'Replace image' : 'Upload image'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onPick}
      />

      <Dialog open={!!rawSrc} onOpenChange={(v) => !v && !saving && setRawSrc(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Crop image</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-72 bg-slate-900 rounded-xl overflow-hidden">
            {rawSrc && (
              <Cropper
                image={rawSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="px-1 pt-2">
            <span className="text-xs text-slate-500">Zoom</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={(v) => setZoom(v[0])}
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRawSrc(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={confirmCrop} disabled={saving || !pixels}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…</> : 'Apply & upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
