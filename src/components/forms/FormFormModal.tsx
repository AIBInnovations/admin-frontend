import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ImageUploadWithCrop } from '@/components/common/ImageUploadWithCrop'
import { Loader2, Plus, X, Eye } from 'lucide-react'
import { Form, FormFormData, FormTemplate, formsService } from '@/services/forms.service'
import { Subject, subjectsService } from '@/services/subjects.service'
import { toast } from 'sonner'

const BANNER_ASPECT_RATIO = 18 / 7

const formSchema = z.object({
  template_id: z.string().min(1, 'Template is required'),
  subject_id: z.string().min(1, 'Subject is required'),
  title: z.string().min(2, 'Title is required').max(300),
  description: z.string().max(2000).optional().or(z.literal('')),
  exam_process: z.string().max(10000).optional().or(z.literal('')),
  payment_amount: z.number().min(0).optional().or(z.nan()).nullable(),
  is_active: z.boolean(),
  display_order: z.number().int().min(0).optional().or(z.nan()),
})

type FormValues = z.infer<typeof formSchema>

interface FormFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: FormFormData) => Promise<void>
  form?: Form | null
  mode: 'create' | 'edit'
}

export function FormFormModal({ open, onClose, onSubmit, form, mode }: FormFormModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [examSlots, setExamSlots] = useState<string[]>([])
  const [newSlot, setNewSlot] = useState('')

  // Banner state
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [existingBannerUrl, setExistingBannerUrl] = useState<string | null>(null)
  const [existingBannerS3Key, setExistingBannerS3Key] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  // Preview state
  const [showPreview, setShowPreview] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      template_id: '',
      subject_id: '',
      title: '',
      description: '',
      exam_process: '',
      payment_amount: 0,
      is_active: true,
      display_order: 0,
    },
  })

  const selectedTemplateId = watch('template_id')
  const selectedTemplate = templates.find((t) => t._id === selectedTemplateId)
  const isExaminerTemplate = selectedTemplate?.slug === 'examiner'

  // Load templates and subjects
  useEffect(() => {
    if (!open) return
    setLoadingOptions(true)
    Promise.all([
      formsService.getTemplates(),
      subjectsService.getSubjects({ page: 1, limit: 100 }),
    ])
      .then(([templatesRes, subjectsRes]) => {
        if (templatesRes.success && templatesRes.data) {
          setTemplates(templatesRes.data.templates || [])
        }
        if (subjectsRes.success && subjectsRes.data) {
          setSubjects(subjectsRes.data.entities || [])
        }
      })
      .catch(() => toast.error('Failed to load options'))
      .finally(() => setLoadingOptions(false))
  }, [open])

  // Populate form on edit
  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && form) {
      const templateId = typeof form.template_id === 'object' ? form.template_id._id : form.template_id
      const subjectId = typeof form.subject_id === 'object' ? form.subject_id._id : form.subject_id
      reset({
        template_id: templateId,
        subject_id: subjectId,
        title: form.title,
        description: form.description || '',
        exam_process: form.exam_process || '',
        payment_amount: form.payment_amount || 0,
        is_active: form.is_active,
        display_order: form.display_order,
      })
      setExamSlots(form.exam_slots || [])
      setExistingBannerUrl(form.banner_url || null)
      setExistingBannerS3Key(form.banner_s3_key || null)
    } else {
      reset({
        template_id: '',
        subject_id: '',
        title: '',
        description: '',
        exam_process: '',
        payment_amount: 0,
        is_active: true,
        display_order: 0,
      })
      setExamSlots([])
      setExistingBannerUrl(null)
      setExistingBannerS3Key(null)
    }
    setBannerFile(null)
    setNewSlot('')
    setUploadProgress(null)
    setShowPreview(false)
  }, [open, mode, form, reset])

  // Auto-fill title & description when template changes (create only)
  useEffect(() => {
    if (mode !== 'create' || !selectedTemplateId) return
    const template = templates.find((t) => t._id === selectedTemplateId)
    if (template) {
      setValue('title', template.default_title)
      setValue('description', template.default_description || '')
    }
  }, [selectedTemplateId, templates, mode, setValue])

  const addSlot = () => {
    const trimmed = newSlot.trim()
    if (!trimmed) return
    if (examSlots.includes(trimmed)) {
      toast.error('This slot already exists')
      return
    }
    setExamSlots((prev) => [...prev, trimmed])
    setNewSlot('')
  }

  const removeSlot = (index: number) => {
    setExamSlots((prev) => prev.filter((_, i) => i !== index))
  }

  const onFormSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      let bannerUrl = existingBannerUrl || undefined
      let bannerS3Key = existingBannerS3Key || undefined

      // Upload banner if new file selected
      if (bannerFile) {
        setUploadProgress(0)
        try {
          const result = await formsService.uploadImage(bannerFile, setUploadProgress)
          bannerUrl = result.imageUrl
          bannerS3Key = result.s3Key
        } catch (err: any) {
          toast.error(err.message || 'Failed to upload banner')
          setUploadProgress(null)
          setSubmitting(false)
          return
        }
        setUploadProgress(null)
      }

      const data: FormFormData = {
        template_id: values.template_id,
        subject_id: values.subject_id,
        title: values.title,
        description: values.description || undefined,
        exam_process: values.exam_process || null,
        banner_url: bannerUrl || null,
        banner_s3_key: bannerS3Key || null,
        payment_amount: isExaminerTemplate ? null : (isNaN(values.payment_amount as number) ? null : (values.payment_amount || null)),
        is_active: values.is_active,
        display_order: isNaN(values.display_order as number) ? undefined : values.display_order,
        exam_slots: isExaminerTemplate ? examSlots : undefined,
      }
      await onSubmit(data)
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  const isUploading = uploadProgress !== null

  // Preview data
  const previewBannerUrl = bannerFile ? URL.createObjectURL(bannerFile) : existingBannerUrl
  const previewTitle = watch('title')
  const previewDescription = watch('description')
  const previewExamProcess = watch('exam_process')
  const paymentAmount = isExaminerTemplate ? 0 : (watch('payment_amount') || 0)

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isUploading && onClose()}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Create Form' : 'Edit Form'}</DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Create a new form from a template and assign it to a subject.'
                : 'Update form details.'}
            </DialogDescription>
          </DialogHeader>

          {loadingOptions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              {/* Template (create only) */}
              <div className="space-y-2">
                <Label>Template *</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={(v) => setValue('template_id', v)}
                  disabled={mode === 'edit'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.template_id && (
                  <p className="text-xs text-red-500">{errors.template_id.message}</p>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select
                  value={watch('subject_id')}
                  onValueChange={(v) => setValue('subject_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.subject_id && (
                  <p className="text-xs text-red-500">{errors.subject_id.message}</p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" {...register('title')} placeholder="Form title" />
                {errors.title && (
                  <p className="text-xs text-red-500">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Form description"
                  rows={3}
                />
                {errors.description && (
                  <p className="text-xs text-red-500">{errors.description.message}</p>
                )}
              </div>

              {/* Exam Process */}
              <div className="space-y-2">
                <Label htmlFor="exam_process">Exam Process</Label>
                <Textarea
                  id="exam_process"
                  {...register('exam_process')}
                  placeholder="Describe the exam process in detail..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Detailed description of the examination process. This will be shown to users before they fill the form.
                </p>
                {errors.exam_process && (
                  <p className="text-xs text-red-500">{errors.exam_process.message}</p>
                )}
              </div>

              {/* Banner Image */}
              <div className="space-y-2">
                <Label>Banner Image</Label>
                <ImageUploadWithCrop
                  value={bannerFile}
                  onChange={(file) => {
                    setBannerFile(file)
                    if (file) {
                      setExistingBannerUrl(null)
                      setExistingBannerS3Key(null)
                    }
                  }}
                  aspectRatio={BANNER_ASPECT_RATIO}
                  maxSize={5 * 1024 * 1024}
                  label="Upload banner image"
                  description="Banner image (18:7 ratio). JPEG, PNG, or WebP. Max 5MB."
                  disabled={submitting || isUploading}
                  currentImageUrl={existingBannerUrl}
                  onDelete={() => {
                    setExistingBannerUrl(null)
                    setExistingBannerS3Key(null)
                    setBannerFile(null)
                  }}
                />
                {uploadProgress !== null && (
                  <div className="space-y-1">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
                  </div>
                )}
              </div>

              {/* Payment Amount — only for non-examiner */}
              {!isExaminerTemplate && (
                <div className="space-y-2">
                  <Label htmlFor="payment_amount">Payment Amount (INR, optional)</Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    min={0}
                    step="0.01"
                    {...register('payment_amount', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    If set, a Zoho payment link will be generated automatically on submission.
                  </p>
                  {errors.payment_amount && (
                    <p className="text-xs text-red-500">{errors.payment_amount.message}</p>
                  )}
                </div>
              )}

              {/* Exam Slots — only for examiner template */}
              {isExaminerTemplate && (
                <div className="space-y-2">
                  <Label>Exam Slots</Label>
                  <p className="text-xs text-muted-foreground">
                    Add the exam slot options that examiners can choose from. Users can select multiple slots.
                  </p>

                  {/* Existing slots */}
                  {examSlots.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {examSlots.map((slot, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-sm"
                        >
                          {slot}
                          <button
                            type="button"
                            onClick={() => removeSlot(index)}
                            className="ml-0.5 hover:text-destructive transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add new slot */}
                  <div className="flex gap-2">
                    <Input
                      value={newSlot}
                      onChange={(e) => setNewSlot(e.target.value)}
                      placeholder="e.g. Long case"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addSlot()
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addSlot}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Display order */}
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  min={0}
                  {...register('display_order', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={watch('is_active')}
                  onCheckedChange={(v) => setValue('is_active', v)}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPreview(true)}
                  disabled={submitting || isUploading}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <div className="flex-1" />
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting || isUploading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || isUploading}>
                  {(submitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === 'create' ? 'Create' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>
              How this form will appear to users on the website.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ── LEFT: Card Preview ── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Card Preview</p>
              <div className="max-w-[320px]">
                <div className="flex flex-col w-full text-left bg-white rounded-2xl border overflow-hidden shadow-sm">
                  {/* Banner / Placeholder */}
                  {previewBannerUrl ? (
                    <div className="w-full" style={{ aspectRatio: '18/7' }}>
                      <img src={previewBannerUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className={`w-full flex items-center justify-center ${isExaminerTemplate ? 'bg-purple-500/5' : 'bg-blue-500/5'}`}
                      style={{ aspectRatio: '18/7' }}
                    >
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={isExaminerTemplate ? 'text-purple-400/40' : 'text-blue-400/30'}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                  )}

                  {/* Card Content */}
                  <div className="flex flex-col flex-1 p-4">
                    <span className={`self-start text-[10px] font-medium px-2 py-0.5 rounded-full mb-2 ${
                      isExaminerTemplate ? 'text-purple-600 bg-purple-500/10' : 'text-blue-600 bg-blue-500/10'
                    }`}>
                      {selectedTemplate?.name || 'Form'}
                    </span>
                    <h3 className="text-sm font-semibold line-clamp-2 leading-snug mb-1.5">
                      {previewTitle || 'Untitled Form'}
                    </h3>
                    {previewDescription && (
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">{previewDescription}</p>
                    )}

                    {/* Footer */}
                    <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      <span>{selectedTemplate?.fields?.length || 0} fields</span>
                      {!isExaminerTemplate && paymentAmount > 0 && (
                        <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                          {'\u20B9'}{paymentAmount}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t">
                      <span className="flex items-center justify-between text-sm font-semibold text-blue-600">
                        Fill Form
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Form Modal Preview ── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Form Modal Preview</p>
              <div className="bg-white rounded-2xl border overflow-hidden shadow-sm max-h-[60vh] overflow-y-auto">
                {/* Banner */}
                {previewBannerUrl ? (
                  <div className="w-full" style={{ aspectRatio: '18/7' }}>
                    <img src={previewBannerUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : null}

                {/* Header */}
                <div className={`px-5 pt-5 pb-4 ${isExaminerTemplate ? 'bg-purple-500/5' : 'bg-blue-500/5'}`}>
                  <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-2 ${
                    isExaminerTemplate ? 'text-purple-600 bg-purple-500/10' : 'text-blue-600 bg-blue-500/10'
                  }`}>
                    {selectedTemplate?.name || 'Form'}
                  </span>
                  <h2 className="text-lg font-bold">{previewTitle || 'Untitled Form'}</h2>
                  {previewDescription && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{previewDescription}</p>
                  )}
                </div>

                {/* Exam Process */}
                {previewExamProcess && (
                  <div className="px-5 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Exam Process</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mt-2">{previewExamProcess}</p>
                  </div>
                )}

                {/* Fields */}
                <div className="px-5 py-5 space-y-4">
                  {selectedTemplate?.fields
                    ?.sort((a, b) => a.display_order - b.display_order)
                    .map((field) => (
                      <div key={field.field_key}>
                        <label className="block text-sm font-medium mb-1.5">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>

                        {field.type === 'radio' && (field.options?.length > 0 || (isExaminerTemplate && examSlots.length > 0)) ? (
                          <div className="space-y-2">
                            {(field.options?.length > 0 ? field.options : examSlots).map((option) => {
                              const isSlotField = isExaminerTemplate && (!field.options || field.options.length === 0)
                              return (
                                <label
                                  key={option}
                                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-muted-foreground ${
                                    isSlotField ? 'border-purple-200/60' : 'border-border/60'
                                  }`}
                                >
                                  <input
                                    type={isSlotField ? 'checkbox' : 'radio'}
                                    disabled
                                    className={isSlotField ? 'accent-purple-500' : 'accent-blue-500'}
                                  />
                                  <span className="text-sm">{option}</span>
                                </label>
                              )
                            })}
                          </div>
                        ) : (
                          <input
                            type={field.type === 'email' ? 'email' : 'text'}
                            disabled
                            placeholder={field.label}
                            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border/60 bg-muted/30"
                          />
                        )}
                      </div>
                    ))}

                  {/* Payment info (non-examiner only) */}
                  {!isExaminerTemplate && paymentAmount > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        This form requires a non-refundable payment of <span className="font-semibold">{'\u20B9'}{paymentAmount}</span>. A payment link will be provided after submission.
                      </p>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="button"
                    disabled
                    className={`w-full py-3 text-white text-sm font-semibold rounded-xl opacity-80 ${
                      isExaminerTemplate ? 'bg-purple-500' : 'bg-blue-500'
                    }`}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
