import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import { Loader2 } from 'lucide-react'
import {
  WebStoreRedirectRule,
  WebStoreRedirectRuleFormData,
} from '@/services/webStoreRedirectRules.service'

const semverRegex = /^\d+(\.\d+){0,2}$/

const ruleSchema = z.object({
  platform: z.enum(['ios', 'android']),
  min_version: z
    .string()
    .min(1, 'min_version is required')
    .regex(semverRegex, 'Must be a semver string like 1.0 or 2.0.3'),
  max_version: z
    .string()
    .refine((v) => v === '' || semverRegex.test(v), 'Must be empty or a semver string')
    .optional(),
  base_url: z
    .string()
    .min(1, 'base_url is required')
    .url('Must be a valid URL including protocol'),
  priority: z.coerce.number().int().min(0).max(1000),
  is_active: z.boolean(),
  description: z.string().max(500).optional(),
})

type RuleFormValues = z.infer<typeof ruleSchema>

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: WebStoreRedirectRuleFormData) => Promise<void>
  rule?: WebStoreRedirectRule | null
  mode: 'create' | 'edit'
}

export function WebStoreRedirectRuleFormModal({ open, onClose, onSubmit, rule, mode }: Props) {
  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      platform: 'ios',
      min_version: '0.0.0',
      max_version: '',
      base_url: '',
      priority: 0,
      is_active: true,
      description: '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && rule) {
      reset({
        platform: rule.platform,
        min_version: rule.min_version,
        max_version: rule.max_version ?? '',
        base_url: rule.base_url,
        priority: rule.priority,
        is_active: rule.is_active,
        description: rule.description ?? '',
      })
    } else {
      reset({
        platform: 'ios',
        min_version: '0.0.0',
        max_version: '',
        base_url: '',
        priority: 0,
        is_active: true,
        description: '',
      })
    }
  }, [open, mode, rule, reset])

  const handleFormSubmit = async (values: RuleFormValues) => {
    try {
      const payload: WebStoreRedirectRuleFormData = {
        platform: values.platform,
        min_version: values.min_version,
        max_version: values.max_version && values.max_version !== '' ? values.max_version : null,
        base_url: values.base_url,
        priority: values.priority,
        is_active: values.is_active,
        description: values.description || '',
      }
      await onSubmit(payload)
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Redirect Rule' : 'Edit Redirect Rule'}</DialogTitle>
          <DialogDescription>
            Map a platform + app version range to a web-store base URL. Higher priority wins on overlap; first match used.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform">Platform <span className="text-red-500">*</span></Label>
            <Controller
              control={control}
              name="platform"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <SelectTrigger id="platform"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ios">iOS</SelectItem>
                    <SelectItem value="android">Android</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.platform && <p className="text-sm text-red-500">{errors.platform.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="min_version">Min Version <span className="text-red-500">*</span></Label>
              <Input id="min_version" placeholder="0.0.0" disabled={isSubmitting} {...register('min_version')} />
              {errors.min_version && <p className="text-sm text-red-500">{errors.min_version.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_version">Max Version</Label>
              <Input id="max_version" placeholder="leave empty for ∞" disabled={isSubmitting} {...register('max_version')} />
              {errors.max_version && <p className="text-sm text-red-500">{errors.max_version.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_url">Base URL <span className="text-red-500">*</span></Label>
            <Input id="base_url" placeholder="https://store.example.com" disabled={isSubmitting} {...register('base_url')} />
            {errors.base_url && <p className="text-sm text-red-500">{errors.base_url.message}</p>}
            <p className="text-xs text-muted-foreground">
              Frontend appends <code>/{'{productType}'}/{'{productId}'}?token=...</code> to this base.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input id="priority" type="number" min={0} max={1000} disabled={isSubmitting} {...register('priority')} />
              {errors.priority && <p className="text-sm text-red-500">{errors.priority.message}</p>}
              <p className="text-xs text-muted-foreground">Higher wins on overlap.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_active">Active</Label>
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <div className="flex h-9 items-center">
                    <Switch
                      id="is_active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Internal note about why this rule exists"
              rows={2}
              disabled={isSubmitting}
              {...register('description')}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Create Rule' : 'Update Rule'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
