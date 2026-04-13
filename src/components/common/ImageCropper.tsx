import { useRef, useState, useEffect } from 'react'
import Cropper, { type ReactCropperElement } from 'react-cropper'
import 'cropperjs/dist/cropper.css'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'

interface ImageCropperProps {
  /** The image file to crop */
  file: File | null
  /** Whether the cropper dialog is open */
  open: boolean
  /** Called when dialog is closed without cropping */
  onClose: () => void
  /** Called with the cropped file when user confirms */
  onCropComplete: (croppedFile: File) => void
  /** Aspect ratio for the crop area (width / height). e.g. 16/7 for banners, 1 for square */
  aspectRatio: number
  /** Title shown in the dialog header */
  title?: string
  /** Description shown below the title */
  description?: string
  /** Whether to show a circular crop guide (visual only, output is still rectangular) */
  circularCrop?: boolean
}

export function ImageCropper({
  file,
  open,
  onClose,
  onCropComplete,
  aspectRatio,
  title = 'Crop Image',
  description = 'Adjust the crop area to your preference.',
  circularCrop = false,
}: ImageCropperProps) {
  const cropperRef = useRef<ReactCropperElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  // Create/revoke object URL when file changes
  useEffect(() => {
    if (file && open) {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      return () => {
        URL.revokeObjectURL(url)
        setImageUrl(null)
      }
    } else {
      setImageUrl(null)
    }
  }, [file, open])

  const handleCrop = async () => {
    const cropper = cropperRef.current?.cropper
    if (!cropper || !file) return

    setIsCropping(true)
    try {
      const canvas = cropper.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      })

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, file.type || 'image/jpeg', 0.92)
      })

      if (!blob) {
        setIsCropping(false)
        return
      }

      const croppedFile = new File([blob], file.name, {
        type: file.type || 'image/jpeg',
        lastModified: Date.now(),
      })

      onCropComplete(croppedFile)
    } catch (err) {
      console.error('Crop failed:', err)
    } finally {
      setIsCropping(false)
    }
  }

  const handleRotate = (degrees: number) => {
    cropperRef.current?.cropper.rotate(degrees)
  }

  const handleZoom = (ratio: number) => {
    cropperRef.current?.cropper.zoom(ratio)
  }

  return (
    <>
      {circularCrop && (
        <style>{`
          .cropper-circular .cropper-view-box,
          .cropper-circular .cropper-face {
            border-radius: 50%;
          }
        `}</style>
      )}
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !isCropping) onClose() }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {imageUrl && (
            <div className="space-y-3">
              <div className={circularCrop ? 'cropper-circular' : ''}>
                <Cropper
                  ref={cropperRef}
                  src={imageUrl}
                  style={{ height: 350, width: '100%' }}
                  aspectRatio={aspectRatio}
                  guides={true}
                  viewMode={1}
                  dragMode="move"
                  autoCropArea={1}
                  background={false}
                  responsive={true}
                  checkOrientation={false}
                />
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-center gap-1">
                <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleRotate(-90)} title="Rotate left">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleRotate(90)} title="Rotate right">
                  <RotateCw className="h-4 w-4" />
                </Button>
                <div className="mx-2 h-4 w-px bg-border" />
                <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleZoom(0.1)} title="Zoom in">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleZoom(-0.1)} title="Zoom out">
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isCropping}>Cancel</Button>
            <Button type="button" onClick={handleCrop} disabled={isCropping || !imageUrl}>
              {isCropping ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cropping...</>
              ) : (
                'Crop & Use'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
