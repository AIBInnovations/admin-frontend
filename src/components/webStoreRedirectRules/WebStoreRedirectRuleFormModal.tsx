import { useEffect, useState } from 'react'
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
import {
  getStoreKind, getVersionRangeMode, describeVersionRange,
  STORE_KIND_HINT, STORE_KIND_LABEL, STORE_PRESETS, UNBOUNDED_MIN,
  VERSION_RANGE_MODE_LABEL, VersionRangeMode, StoreKind,
} from '@/lib/webStoreRedirect'

const semverRegex = /^\d+(\.\d+){0,2}$/

const ruleSchema = z.object({
  platform: z.enum(['ios', 'android']),
  min_version: z
    .string()
    .min(1, 'Enter a version, e.g. 2.0.4')
    .regex(semverRegex, 'Use numbers only, e.g. 2.0.4'),
  max_version: z
    .string()
    .refine((v) => v === '' || semverRegex.test(v), 'Use numbers only, e.g. 2.0.3')
    .optional(),
  base_url: z
    .string()
    .min(1, 'Pick a store or paste a link')
    .url('Must be a full link starting with https://'),
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

const EMPTY_FORM: RuleFormValues = {
  platform: 'ios',
  min_version: UNBOUNDED_MIN,
  max_version: '',
  base_url: '',
  priority: 0,
  is_active: true,
  description: '',
}

export function WebStoreRedirectRuleFormModal({ open, onClose, onSubmit, rule, mode }: Props) {
  const {
    register, handleSubmit, control, setValue, watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: EMPTY_FORM,
  })

  // Which versions the rule covers, and which store it opens, are asked as
  // plain choices. Both are stored in the same min/max/base_url fields the
  // API already expects — these two pieces of state only drive the wording.
  const [rangeMode, setRangeMode] = useState<VersionRangeMode>('all')
  const [storeChoice, setStoreChoice] = useState<StoreKind>('content_only')

  const minVersion = watch('min_version')
  const maxVersion = watch('max_version')

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
      setRangeMode(getVersionRangeMode(rule.min_version, rule.max_version))
      setStoreChoice(getStoreKind(rule.base_url))
    } else {
      reset(EMPTY_FORM)
      setRangeMode('all')
      setStoreChoice('content_only')
      setValue('base_url', STORE_PRESETS[0].url)
    }
  }, [open, mode, rule, reset, setValue])

  const handleRangeModeChange = (next: VersionRangeMode) => {
    setRangeMode(next)
    if (next === 'all') {
      setValue('min_version', UNBOUNDED_MIN)
      setValue('max_version', '')
    } else if (next === 'newer') {
      if (minVersion === UNBOUNDED_MIN) setValue('min_version', '')
      setValue('max_version', '')
    } else if (next === 'older') {
      setValue('min_version', UNBOUNDED_MIN)
    } else if (minVersion === UNBOUNDED_MIN) {
      setValue('min_version', '')
    }
  }

  const handleStoreChoiceChange = (next: StoreKind) => {
    setStoreChoice(next)
    const preset = STORE_PRESETS.find((p) => p.kind === next)
    setValue('base_url', preset ? preset.url : '', { shouldValidate: false })
  }

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

  const showMin = rangeMode === 'newer' || rangeMode === 'between'
  const showMax = rangeMode === 'older' || rangeMode === 'between'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Redirect Rule' : 'Edit Redirect Rule'}</DialogTitle>
          <DialogDescription>
            Choose which app versions this rule covers and which web store they should open.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform">App <span className="text-red-500">*</span></Label>
            <Controller
              control={control}
              name="platform"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <SelectTrigger id="platform"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ios">iPhone / iPad app</SelectItem>
                    <SelectItem value="android">Android app</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.platform && <p className="text-sm text-red-500">{errors.platform.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="range_mode">Which app versions? <span className="text-red-500">*</span></Label>
            <Select
              value={rangeMode}
              onValueChange={(v) => handleRangeModeChange(v as VersionRangeMode)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="range_mode"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(VERSION_RANGE_MODE_LABEL) as VersionRangeMode[]).map((m) => (
                  <SelectItem key={m} value={m}>{VERSION_RANGE_MODE_LABEL[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(showMin || showMax) && (
            <div className={showMin && showMax ? 'grid grid-cols-2 gap-3' : ''}>
              {showMin && (
                <div className="space-y-2">
                  <Label htmlFor="min_version">
                    {rangeMode === 'between' ? 'From version' : 'Version'} <span className="text-red-500">*</span>
                  </Label>
                  <Input id="min_version" placeholder="2.0.4" disabled={isSubmitting} {...register('min_version')} />
                  {errors.min_version && <p className="text-sm text-red-500">{errors.min_version.message}</p>}
                </div>
              )}
              {showMax && (
                <div className="space-y-2">
                  <Label htmlFor="max_version">
                    {rangeMode === 'between' ? 'Up to version' : 'Version'} <span className="text-red-500">*</span>
                  </Label>
                  <Input id="max_version" placeholder="2.0.3" disabled={isSubmitting} {...register('max_version')} />
                  {errors.max_version && <p className="text-sm text-red-500">{errors.max_version.message}</p>}
                </div>
              )}
            </div>
          )}

          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            This rule applies to: <span className="font-medium text-foreground">
              {describeVersionRange(minVersion || UNBOUNDED_MIN, maxVersion || null)}
            </span>
          </p>

          <div className="space-y-2">
            <Label htmlFor="store_choice">Which store should open? <span className="text-red-500">*</span></Label>
            <Select
              value={storeChoice}
              onValueChange={(v) => handleStoreChoiceChange(v as StoreKind)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="store_choice"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORE_PRESETS.map((p) => (
                  <SelectItem key={p.kind} value={p.kind}>{STORE_KIND_LABEL[p.kind]}</SelectItem>
                ))}
                <SelectItem value="custom">{STORE_KIND_LABEL.custom}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{STORE_KIND_HINT[storeChoice]}</p>
          </div>

          {storeChoice === 'custom' ? (
            <div className="space-y-2">
              <Label htmlFor="base_url">Store link <span className="text-red-500">*</span></Label>
              <Input id="base_url" placeholder="https://store.example.com" disabled={isSubmitting} {...register('base_url')} />
              {errors.base_url && <p className="text-sm text-red-500">{errors.base_url.message}</p>}
            </div>
          ) : (
            <>
              <input type="hidden" {...register('base_url')} />
              {errors.base_url && <p className="text-sm text-red-500">{errors.base_url.message}</p>}
            </>
          )}

          <div className="grid grid-cols-2 gap-3 items-start">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input id="priority" type="number" min={0} max={1000} disabled={isSubmitting} {...register('priority')} />
              {errors.priority && <p className="text-sm text-red-500">{errors.priority.message}</p>}
              <p className="text-xs text-muted-foreground">
                If two rules cover the same version, the higher number is used.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_active">Rule is on</Label>
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
              <p className="text-xs text-muted-foreground">Turn off to stop using this rule.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Note (optional)</Label>
            <Textarea
              id="description"
              placeholder="Why this rule exists — only staff see this"
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Saving...' : 'Saving...'}</>
              ) : (
                <>{mode === 'create' ? 'Add Rule' : 'Save Changes'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
