import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { FileUpload } from '@/components/common/FileUpload'
import { ImageUploadWithCrop } from '@/components/common/ImageUploadWithCrop'
import { Section, StatusPill } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, ProgressBar } from '@/components/users/kit'
import { errText, focusFirstError, unwrap } from '@/components/users/lib'
import { packageTypesService, type PackageType } from '@/services/packageTypes.service'

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Keep the name under 100 characters'),
  description: z.string().trim().min(2, 'Description is required').max(500, 'Keep the description under 500 characters'),
})
type Values = z.infer<typeof schema>

interface PackageTypeFormModalProps {
  open: boolean
  onClose: () => void
  /** Called after a save, so the list can refresh. */
  onSaved: () => void
  packageType?: PackageType | null
  mode: 'create' | 'edit'
}

export function PackageTypeFormModal({ open, onClose, onSaved, packageType, mode }: PackageTypeFormModalProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [trailerFile, setTrailerFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // A type created here whose file upload failed: the next save updates it
  const [createdId, setCreatedId] = useState<string | null>(null)

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: { name: '', description: '' }, shouldFocusError: false,
  })
  const description = watch('description')

  useEffect(() => {
    if (!open) return
    setTrailerFile(null)
    setThumbnailFile(null)
    setUploadProgress(null)
    setSubmitError(null)
    setCreatedId(null)
    reset(mode === 'edit' && packageType ? { name: packageType.name, description: packageType.description } : { name: '', description: '' })
  }, [open, mode, packageType, reset])

  const onSubmit = async (data: Values) => {
    setSubmitError(null)
    let id = packageType?._id ?? createdId
    try {
      const saved = id ? unwrap(await packageTypesService.update(id, data), 'Failed to update package type') : unwrap(await packageTypesService.create(data), 'Failed to create package type')
      id = id ?? saved._id
      if (!packageType) setCreatedId(id)
    } catch (err) {
      setSubmitError(errText(err, mode === 'create' ? 'Failed to create package type' : 'Failed to update package type'))
      return
    }
    try {
      if (trailerFile) {
        setUploadProgress(0)
        await packageTypesService.uploadTrailer(id, trailerFile, setUploadProgress)
        setTrailerFile(null)
      }
      if (thumbnailFile) {
        await packageTypesService.uploadThumbnail(id, thumbnailFile)
        setThumbnailFile(null)
      }
    } catch (err) {
      onSaved()
      setSubmitError(`The details are saved, but a file could not be uploaded: ${errText(err, 'the upload did not finish.')} Save again to retry.`)
      return
    } finally {
      setUploadProgress(null)
    }
    toast.success(mode === 'create' ? 'Package type created successfully' : 'Package type updated successfully')
    onSaved()
    onClose()
  }

  const busy = isSubmitting || uploadProgress !== null
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose() }}>
      <DialogContent backLabel="Package Types">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Package Type' : 'Edit Package Type'}</DialogTitle>
          <DialogDescription>{mode === 'create' ? 'Add a new package type (e.g. Theory, Practical).' : 'Update the package type details below.'}</DialogDescription>
        </DialogHeader>
        <form ref={formRef} noValidate onSubmit={handleSubmit(onSubmit, () => focusFirstError(formRef.current))} className="space-y-6">
          <Section title="Details">
            <div className="space-y-5">
              <Field id="pt-name" label="Name" required error={errors.name?.message}><Input placeholder="e.g., Theory" autoComplete="off" disabled={busy} {...register('name')} /></Field>
              <Field id="pt-description" label="Description" required error={errors.description?.message} aside={`${(description || '').length}/500`}><Textarea placeholder="Brief description of this package type..." rows={3} disabled={busy} {...register('description')} /></Field>
            </div>
          </Section>
          <Section title="Media" description={mode === 'create' ? 'Uploaded right after the type is created.' : 'New files are uploaded when you save.'}>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-medium">Trailer Video (Optional)</p>{packageType?.trailer_video_url && !trailerFile && <StatusPill tone="success" className="h-5 px-2 text-[11px]">Uploaded</StatusPill>}</div>
                {packageType?.trailer_video_url && !trailerFile && <a href={packageType.trailer_video_url} target="_blank" rel="noopener noreferrer" className="block truncate text-[13px] font-medium text-primary hover:underline hover:underline-offset-4">Watch the current trailer</a>}
                <FileUpload
                  accept={{ 'video/*': ['.mp4', '.mov', '.avi', '.webm'] }} maxSize={500 * 1024 * 1024} maxFiles={1} value={trailerFile ? [trailerFile] : []}
                  onChange={(files) => setTrailerFile(files[0] || null)} label="Upload trailer video" description="Max 500MB. Drag & drop or click to browse." disabled={busy}
                />
                {uploadProgress !== null && <ProgressBar value={uploadProgress} label="Uploading trailer" />}
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-[13px] font-medium">Thumbnail (Optional)</p>
                <ImageUploadWithCrop
                  value={thumbnailFile} onChange={setThumbnailFile} aspectRatio={16 / 9} maxSize={5 * 1024 * 1024} label="Upload thumbnail image"
                  description="16:9 aspect ratio. Max 5MB." disabled={busy} currentImageUrl={packageType?.thumbnail_url}
                />
              </div>
            </div>
          </Section>
          <DialogFooter className="sm:items-center">
            {submitError && <p role="alert" className="min-w-0 flex-1 text-[13px] text-danger">{submitError}</p>}
            <Button type="button" variant="outline" className="bg-card" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
              {busy ? (mode === 'create' ? 'Creating…' : 'Updating…') : mode === 'create' ? 'Create Type' : 'Update Type'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
