import { useState } from 'react'
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
        alert('Please select an image file')
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

  const handleRemove = () => {
    onChange(null)
    if (onDelete) {
      onDelete()
    }
  }

  const aspectRatioText =
    aspectRatio === 1 ? '1:1' : aspectRatio === 16 / 9 ? '16:9' : `${aspectRatio}:1`

  const finalDescription =
    description || `Recommended ratio: ${aspectRatioText}. Max ${Math.round(maxSize / (1024 * 1024))}MB.`

  return (
    <>
      <div className="space-y-2 min-w-0">
        {/* Show current image if exists and no new file selected */}
        {currentImageUrl && !value ? (
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
                className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        ) : value ? (
          <div className="relative inline-block max-w-full">
            <img
              src={URL.createObjectURL(value)}
              alt="Preview"
              className="rounded-lg w-full border"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
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
