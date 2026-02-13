import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2, Upload } from 'lucide-react'
import { Document, DocumentFormData } from '@/services/documents.service'
import { Series, seriesService } from '@/services/series.service'

const documentSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(300),
  description: z.string().max(2000).optional().or(z.literal('')),
  series_id: z.string().min(1, 'Series is required'),
  is_free: z.boolean(),
  display_order: z.number().int().min(0).optional().or(z.nan()),
})

type DocumentFormValues = z.infer<typeof documentSchema>

interface DocumentFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: DocumentFormData, file?: File, onProgress?: (percent: number) => void) => Promise<void>
  document?: Document | null
  mode: 'create' | 'edit'
  defaultSeriesId?: string
}

export function DocumentFormModal({ open, onClose, onSubmit, document: doc, mode, defaultSeriesId }: DocumentFormModalProps) {
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [docFile, setDocFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: '', description: '', series_id: '', is_free: false, display_order: 0,
    },
  })

  const isFree = watch('is_free')

  // Fetch dropdown data
  useEffect(() => {
    if (open) {
      seriesService.getAll({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
        if (res.success && res.data) setSeriesList(res.data.entities)
      })
    }
  }, [open])

  // Reset form
  useEffect(() => {
    if (open) {
      setDocFile(null)
      if (mode === 'edit' && doc) {
        reset({
          title: doc.title,
          description: doc.description || '',
          series_id: typeof doc.series_id === 'object' ? doc.series_id._id : doc.series_id,
          is_free: doc.is_free,
          display_order: doc.display_order,
        })
      } else {
        reset({
          title: '', description: '', series_id: defaultSeriesId || '', is_free: false, display_order: 0,
        })
      }
    }
  }, [open, mode, doc, reset, defaultSeriesId])

  const handleFormSubmit = async (data: DocumentFormValues) => {
    if (mode === 'create' && !docFile) return
    setUploadProgress(null)

    try {
      const formData: DocumentFormData = {
        title: data.title,
        description: data.description || '',
        series_id: data.series_id,
        is_free: data.is_free,
        display_order: data.display_order || undefined,
      }
      await onSubmit(formData, docFile || undefined, (pct) => setUploadProgress(pct))
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setUploadProgress(null)
    }
  }

  const handleClose = () => { if (!isSubmitting) onClose() }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Upload Document' : 'Edit Document'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Upload a new study document.' : 'Update the document details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input id="title" placeholder="e.g., Anatomy Notes Chapter 1" disabled={isSubmitting} {...register('title')} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Document description..." rows={3} disabled={isSubmitting} {...register('description')} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          {/* Series */}
          <div className="space-y-2">
            <Label>Series <span className="text-red-500">*</span></Label>
            <Controller
              name="series_id" control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting || (mode === 'create' && !!defaultSeriesId)}>
                  <SelectTrigger><SelectValue placeholder="Select series" /></SelectTrigger>
                  <SelectContent>
                    {seriesList.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}{typeof s.package_id === 'object' ? ` (${s.package_id.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.series_id && <p className="text-sm text-red-500">{errors.series_id.message}</p>}
          </div>

          {/* Document File (create only) */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label>Document File <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm hover:bg-muted/50 transition-colors flex-1">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {docFile ? docFile.name : 'Choose document file...'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.epub,.doc,.docx,.ppt,.pptx"
                    className="hidden"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    disabled={isSubmitting}
                  />
                </label>
              </div>
              {docFile && (
                <p className="text-xs text-muted-foreground">
                  {(docFile.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              )}
              {!docFile && (
                <p className="text-xs text-muted-foreground">Supported: PDF, EPUB, DOC, DOCX, PPT, PPTX (max 100 MB)</p>
              )}
            </div>
          )}

          {/* Display Order + Free Toggle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input id="display_order" type="number" min={0} disabled={isSubmitting} {...register('display_order', { valueAsNumber: true })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is_free" className="text-sm">Free</Label>
                <p className="text-xs text-muted-foreground">
                  {isFree ? 'Free access' : 'Paid only'}
                </p>
              </div>
              <Switch
                id="is_free" checked={isFree}
                onCheckedChange={(checked) => setValue('is_free', checked)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Upload progress bar */}
          {uploadProgress !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{uploadProgress < 100 ? 'Uploading to cloud...' : 'Finalizing...'}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || (mode === 'create' && !docFile)}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Uploading...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Upload Document' : 'Update Document'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
