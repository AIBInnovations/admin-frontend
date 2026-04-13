import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2, Clock, Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarqueeText } from '@/components/common/MarqueeText'
import { UpcomingVideoFormData } from '@/services/videos.service'
import { Module, modulesService } from '@/services/modules.service'
import { apiService } from '@/services/api.service'

interface FacultyOption {
  _id: string
  name: string
}

const upcomingSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(300),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  module_id: z.string().min(1, 'Module is required'),
  faculty_id: z.string().optional().or(z.literal('')),
  display_order: z.coerce.number().int().min(0, 'Must be 0 or greater').default(0),
  is_free: z.boolean(),
  scheduled_release_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Please select a release date')
    .min(1, 'Release date is required'),
})

type UpcomingFormValues = z.infer<typeof upcomingSchema>

interface UpcomingVideoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: UpcomingVideoFormData) => Promise<void>
  defaultModuleId?: string
}

export function UpcomingVideoModal({ open, onClose, onSubmit, defaultModuleId }: UpcomingVideoModalProps) {
  const [modules, setModules] = useState<Module[]>([])
  const [faculty, setFaculty] = useState<FacultyOption[]>([])
  const [modulePopoverOpen, setModulePopoverOpen] = useState(false)
  const [facultyPopoverOpen, setFacultyPopoverOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<UpcomingFormValues>({
    resolver: zodResolver(upcomingSchema),
    defaultValues: {
      title: '', description: '', module_id: '', faculty_id: '',
      display_order: 0, is_free: false, scheduled_release_at: '',
    },
  })

  const isFree = watch('is_free')
  const watchScheduledDate = watch('scheduled_release_at')

  useEffect(() => {
    if (open) {
      modulesService.getAll({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
        if (res.success && res.data) setModules(res.data.entities)
      })
      apiService.get<{ entities: FacultyOption[] }>('admin/faculty?limit=100&sort_by=name&sort_order=asc').then((res) => {
        if (res.success && res.data) setFaculty(res.data.entities || [])
      })
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setSubmitError(null)
      reset({
        title: '', description: '', module_id: defaultModuleId || '', faculty_id: '',
        display_order: 0, is_free: false, scheduled_release_at: '',
      })
    }
  }, [open, reset, defaultModuleId])

  const handleFormSubmit = async (data: UpcomingFormValues) => {
    setSubmitError(null)
    try {
      const formData: UpcomingVideoFormData = {
        title: data.title,
        description: data.description,
        module_id: data.module_id,
        faculty_id: data.faculty_id || undefined,
        display_order: data.display_order,
        is_free: data.is_free,
        scheduled_release_at: new Date(data.scheduled_release_at).toISOString(),
      }
      await onSubmit(formData)
      onClose()
    } catch (error: any) {
      setSubmitError(error?.message || 'Failed to create upcoming video.')
    }
  }

  const handleClose = () => { if (!isSubmitting) onClose() }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Add Upcoming Video
          </DialogTitle>
          <DialogDescription>
            Announce a video that will be released later. No file upload needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="upcoming-title">Title <span className="text-red-500">*</span></Label>
            <Input id="upcoming-title" placeholder="e.g., Introduction to Anatomy" disabled={isSubmitting} {...register('title')} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="upcoming-description">Description <span className="text-red-500">*</span></Label>
            <Textarea id="upcoming-description" placeholder="Brief description of the upcoming video..." rows={3} disabled={isSubmitting} {...register('description')} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          {/* Module + Faculty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Module <span className="text-red-500">*</span></Label>
              <Controller
                name="module_id" control={control}
                render={({ field }) => (
                  <Popover open={modulePopoverOpen} onOpenChange={setModulePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline" role="combobox"
                        disabled={isSubmitting || !!defaultModuleId}
                        className="w-full justify-between font-normal h-9"
                      >
                        <MarqueeText>
                          {field.value
                            ? (() => {
                                const m = modules.find(m => m._id === field.value)
                                return m ? `${m.name}${typeof m.series_id === 'object' ? ` (${m.series_id.name})` : ''}` : 'Select module'
                              })()
                            : 'Select module'}
                        </MarqueeText>
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search modules..." />
                        <CommandList>
                          <CommandEmpty>No modules found.</CommandEmpty>
                          <CommandGroup>
                            {modules.map((m) => (
                              <CommandItem
                                key={m._id}
                                value={`${m.name}${typeof m.series_id === 'object' ? ` (${m.series_id.name})` : ''}`}
                                onSelect={() => {
                                  field.onChange(m._id)
                                  setModulePopoverOpen(false)
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', field.value === m._id ? 'opacity-100' : 'opacity-0')} />
                                {m.name}{typeof m.series_id === 'object' ? ` (${m.series_id.name})` : ''}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.module_id && <p className="text-sm text-red-500">{errors.module_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Faculty</Label>
              <Controller
                name="faculty_id" control={control}
                render={({ field }) => (
                  <Popover open={facultyPopoverOpen} onOpenChange={setFacultyPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline" role="combobox"
                        disabled={isSubmitting}
                        className="w-full justify-between font-normal h-9"
                      >
                        <MarqueeText>
                          {field.value ? faculty.find(f => f._id === field.value)?.name || 'Select faculty' : 'None'}
                        </MarqueeText>
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search faculty..." />
                        <CommandList>
                          <CommandEmpty>No faculty found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="None"
                              onSelect={() => {
                                field.onChange('')
                                setFacultyPopoverOpen(false)
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', !field.value ? 'opacity-100' : 'opacity-0')} />
                              None
                            </CommandItem>
                            {faculty.map((f) => (
                              <CommandItem
                                key={f._id}
                                value={f.name}
                                onSelect={() => {
                                  field.onChange(f._id)
                                  setFacultyPopoverOpen(false)
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', field.value === f._id ? 'opacity-100' : 'opacity-0')} />
                                {f.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
          </div>

          {/* Display Order + Free Toggle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="upcoming-display_order">Display Order</Label>
              <Input
                id="upcoming-display_order" type="number" min={0}
                placeholder="0" disabled={isSubmitting}
                {...register('display_order')}
              />
              <p className="text-xs text-muted-foreground">Order within the module (0 = auto)</p>
              {errors.display_order && <p className="text-sm text-red-500">{errors.display_order.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Access</Label>
              <div className="flex items-center justify-between rounded-lg border p-3 h-10 box-content">
                <Label htmlFor="upcoming-is_free" className="text-sm font-normal cursor-pointer">
                  {isFree ? 'Free — no purchase needed' : 'Paid — requires purchase'}
                </Label>
                <Switch
                  id="upcoming-is_free" checked={isFree}
                  onCheckedChange={(checked) => setValue('is_free', checked)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Schedule Release Date (required) */}
          <div className="space-y-2">
            <Label htmlFor="upcoming-scheduled_release_at" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-orange-500" /> Release Date <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="upcoming-scheduled_release_at"
                type="datetime-local"
                disabled={isSubmitting}
                {...register('scheduled_release_at')}
              />
              {watchScheduledDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setValue('scheduled_release_at', '')}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              When will this video be available? Time is in your local timezone.
            </p>
            {watchScheduledDate && new Date(watchScheduledDate) < new Date() && (
              <p className="text-xs text-amber-600">
                This date is in the past — the video will appear as available immediately.
              </p>
            )}
            {errors.scheduled_release_at && (
              <p className="text-sm text-red-500">{errors.scheduled_release_at.message}</p>
            )}
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {submitError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
              ) : (
                <><Clock className="mr-2 h-4 w-4" />Add Upcoming Video</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
