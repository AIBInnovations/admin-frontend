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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, X } from 'lucide-react'
import { Form, FormFormData, FormTemplate, formsService } from '@/services/forms.service'
import { Subject, subjectsService } from '@/services/subjects.service'
import { toast } from 'sonner'

const formSchema = z.object({
  template_id: z.string().min(1, 'Template is required'),
  subject_id: z.string().min(1, 'Subject is required'),
  title: z.string().min(2, 'Title is required').max(300),
  description: z.string().max(2000).optional().or(z.literal('')),
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
        payment_amount: form.payment_amount || 0,
        is_active: form.is_active,
        display_order: form.display_order,
      })
      setExamSlots(form.exam_slots || [])
    } else {
      reset({
        template_id: '',
        subject_id: '',
        title: '',
        description: '',
        payment_amount: 0,
        is_active: true,
        display_order: 0,
      })
      setExamSlots([])
    }
    setNewSlot('')
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
      const data: FormFormData = {
        template_id: values.template_id,
        subject_id: values.subject_id,
        title: values.title,
        description: values.description || undefined,
        payment_amount: isNaN(values.payment_amount as number) ? null : (values.payment_amount || null),
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
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

            {/* Payment Amount */}
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

            {/* Exam Slots — only for examiner template */}
            {isExaminerTemplate && (
              <div className="space-y-2">
                <Label>Exam Slots</Label>
                <p className="text-xs text-muted-foreground">
                  Add the exam slot options that examiners can choose from.
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Create' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
