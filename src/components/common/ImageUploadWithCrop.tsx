import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { FileUpload } from './FileUpload'
import { ImageCropDialog } from './ImageCropDialog'

interface ImageUploadWithCropProps {
  value?: File | null
  onChange: (file: File | null) => void
  aspectRatio?: number // 16/9 for thumbnails, 1 for icons
  maxSize?: number
  label?: string
  description?: string
  disabled?: boolean
  currentImageUrl?: string | null
  onDelete?: () => void
}

export function ImageUploadWithCrop({
  value,
  onChange,
  aspectRatio = 16 / 9,
  maxSize = 5 * 1024 * 1024, // 5MB default
  label = 'Upload image',
  description,
  disabled = false,
  currentImageUrl,
  onDelete,
}: ImageUploadWithCropProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [showCropDialog, setShowCropDialog] = useState(false)

  const handleFileSelect = (files: File[]) => {
    const file = files[0]
    if (file) {
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        toast.error('Choose an image file (JPG, PNG or WebP).')
        return
      }

      setSelectedImage(file)
      setShowCropDialog(true)
    }
  }

  const handleCropComplete = (croppedFile: File) => {
    onChange(croppedFile)
    setShowCropDialog(false)
    setSelectedImage(null)
  }

  const handleCropCancel = () => {
    setShowCropDialog(false)
    setSelectedImage(null)
  }

  // Clearing a newly chosen file must not delete the saved image too.
  const handleRemove = () => {
    if (value) onChange(null)
    else onDelete?.()
  }

  // One object URL per file, released when it changes.
  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const aspectRatioText =
    aspectRatio === 1 ? '1:1' : aspectRatio === 16 / 9 ? '16:9' : `${aspectRatio}:1`

  const finalDescription =
    description || `Recommended ratio: ${aspectRatioText}. Max ${Math.round(maxSize / (1024 * 1024))}MB.`

  return (
    <>
      <div className="space-y-2 min-w-0">
        {/* Show current image if exists and no new file selected */}
        {currentImageUrl && !value ? (
          <div className="space-y-2">
            <div className="relative inline-block max-w-full">
              <img
                src={currentImageUrl}
                alt="Current"
                className="rounded-lg w-full border"
              />
              {onDelete && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled}
                  aria-label="Remove image"
                  className="absolute right-1.5 top-1.5 rounded-full bg-danger p-1.5 text-white shadow-sm hover:bg-danger/90 disabled:opacity-50"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <FileUpload
              accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
              maxSize={maxSize}
              maxFiles={1}
              value={[]}
              onChange={handleFileSelect}
              label="Change image"
              description={finalDescription}
              disabled={disabled}
            />
          </div>
        ) : value ? (
          <div className="relative inline-block max-w-full">
            <img
              src={previewUrl ?? undefined}
              alt="Preview"
              className="rounded-lg w-full border"
            />
            <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled}
                  aria-label="Remove chosen image"
                  className="absolute right-1.5 top-1.5 rounded-full bg-danger p-1.5 text-white shadow-sm hover:bg-danger/90 disabled:opacity-50"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
          </div>
        ) : (
          <FileUpload
            accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
            maxSize={maxSize}
            maxFiles={1}
            value={[]}
            onChange={handleFileSelect}
            label={label}
            description={finalDescription}
            disabled={disabled}
          />
        )}
      </div>

      {/* Crop Dialog */}
      {selectedImage && (
        <ImageCropDialog
          open={showCropDialog}
          imageFile={selectedImage}
          aspectRatio={aspectRatio}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  )
}
