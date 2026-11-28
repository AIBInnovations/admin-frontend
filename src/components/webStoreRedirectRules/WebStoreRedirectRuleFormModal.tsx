import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Section } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, ToggleRow } from '@/components/users/kit'
import { errText, focusFirstError, unwrap } from '@/components/users/lib'
import { webStoreRedirectRulesService, type WebStoreRedirectRule, type WebStoreRedirectRuleFormData } from '@/services/webStoreRedirectRules.service'
import {
  describeVersionRange, getStoreHost, getStoreKind, getVersionRangeMode, STORE_KIND_HINT, STORE_KIND_LABEL, STORE_PRESETS, UNBOUNDED_MIN, VERSION_RANGE_MODE_LABEL,
  type StoreKind, type VersionRangeMode,
} from '@/lib/webStoreRedirect'

const semver = /^\d+(\.\d+){0,2}$/
/** 1 when a > b, -1 when a < b, 0 when equal. */
function compareVersions(a: string, b: string): number {
  const x = a.split('.').map(Number); const y = b.split('.').map(Number)
  for (let i = 0; i < 3; i += 1) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1 }
  return 0
}

const makeSchema = (mode: VersionRangeMode) => z.object({
  platform: z.enum(['ios', 'android']),
  min_version: z.string().trim().min(1, 'Enter a version, e.g. 2.0.4').regex(semver, 'Use numbers only, e.g. 2.0.4'),
  max_version: z.string().trim().refine((v) => v === '' || semver.test(v), 'Use numbers only, e.g. 2.0.3'),
  base_url: z.string().trim().min(1, 'Pick a store or paste a link').url('Must be a full link starting with https://'),
  priority: z.number({ error: 'Enter a number from 0 to 1000' }).int('Use a whole number').min(0, 'Use 0 or more').max(1000, 'Use 1000 or less'),
  is_active: z.boolean(),
  description: z.string().max(500, 'Keep the note under 500 characters'),
}).superRefine((d, ctx) => {
  if ((mode === 'older' || mode === 'between') && !d.max_version) ctx.addIssue({ code: 'custom', path: ['max_version'], message: 'Enter a version, e.g. 2.0.3' })
  if (mode === 'between' && semver.test(d.min_version) && semver.test(d.max_version) && compareVersions(d.min_version, d.max_version) > 0) ctx.addIssue({ code: 'custom', path: ['max_version'], message: 'This must not be older than the first version' })
})
type Values = z.infer<ReturnType<typeof makeSchema>>

const EMPTY: Values = { platform: 'ios', min_version: UNBOUNDED_MIN, max_version: '', base_url: '', priority: 0, is_active: true, description: '' }

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  rule?: WebStoreRedirectRule | null
  mode: 'create' | 'edit'
}

export function WebStoreRedirectRuleFormModal({ open, onClose, onSaved, rule, mode }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Which versions the rule covers, and which store it opens, are asked as
  // plain choices. Both are stored in the same min/max/base_url fields the
  // API already expects; these two pieces of state only drive the wording.
  const [rangeMode, setRangeMode] = useState<VersionRangeMode>('all')
  const [storeChoice, setStoreChoice] = useState<StoreKind>('content_only')
  const schema = useMemo(() => makeSchema(rangeMode), [rangeMode])

  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY, shouldFocusError: false })
  const v = watch()

  useEffect(() => {
    if (!open) return
    setSubmitError(null)
    if (mode === 'edit' && rule) {
      reset({ platform: rule.platform, min_version: rule.min_version, max_version: rule.max_version ?? '', base_url: rule.base_url, priority: rule.priority, is_active: rule.is_active, description: rule.description ?? '' })
      setRangeMode(getVersionRangeMode(rule.min_version, rule.max_version))
      setStoreChoice(getStoreKind(rule.base_url))
    } else {
      reset({ ...EMPTY, base_url: STORE_PRESETS[0].url })
      setRangeMode('all')
      setStoreChoice('content_only')
    }
  }, [open, mode, rule, reset])

  const changeRange = (next: VersionRangeMode) => {
    setRangeMode(next)
    if (next === 'all') { setValue('min_version', UNBOUNDED_MIN); setValue('max_version', '') }
    else if (next === 'newer') { if (v.min_version === UNBOUNDED_MIN) setValue('min_version', ''); setValue('max_version', '') }
    else if (next === 'older') setValue('min_version', UNBOUNDED_MIN)
    else if (v.min_version === UNBOUNDED_MIN) setValue('min_version', '')
  }
  const changeStore = (next: StoreKind) => {
    setStoreChoice(next)
    setValue('base_url', STORE_PRESETS.find((p) => p.kind === next)?.url ?? '', { shouldValidate: false })
  }

  const onSubmit = async (values: Values) => {
    setSubmitError(null)
    const payload: WebStoreRedirectRuleFormData = {
      platform: values.platform, min_version: values.min_version, max_version: values.max_version || null, base_url: values.base_url,
      priority: values.priority, is_active: values.is_active, description: values.description || '',
    }
    try {
      if (mode === 'create') {
        unwrap(await webStoreRedirectRulesService.create(payload), 'Failed to create rule')
        toast.success('Rule created successfully')
      } else {
        unwrap(await webStoreRedirectRulesService.update(rule!._id, payload), 'Failed to update rule')
        toast.success('Rule updated successfully')
      }
      onSaved()
      onClose()
    } catch (err) {
      setSubmitError(errText(err, 'Failed to save rule'))
    }
  }

  const showMin = rangeMode === 'newer' || rangeMode === 'between'
  const showMax = rangeMode === 'older' || rangeMode === 'between'
  const busy = isSubmitting
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose() }}>
      <DialogContent backLabel="Web Store Redirect">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Redirect Rule' : 'Edit Redirect Rule'}</DialogTitle>
          <DialogDescription>Choose which app versions this rule covers and which web store they should open.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} noValidate onSubmit={handleSubmit(onSubmit, () => focusFirstError(formRef.current))} className="space-y-6">
          <Section title="When it applies">
            <div className="grid gap-5 sm:grid-cols-2">
              <Controller control={control} name="platform" render={({ field }) => (
                <Field id="platform" label="App" required error={errors.platform?.message}>
                  <Choice value={field.value} onChange={field.onChange} disabled={busy} options={[['ios', 'iPhone / iPad app'], ['android', 'Android app']]} />
                </Field>
              )} />
              <Field id="range_mode" label="Which app versions?" required>
                <Choice value={rangeMode} onChange={(m) => changeRange(m as VersionRangeMode)} disabled={busy} options={(Object.keys(VERSION_RANGE_MODE_LABEL) as VersionRangeMode[]).map((m) => [m, VERSION_RANGE_MODE_LABEL[m]])} />
              </Field>
              {showMin && (
                <Field id="min_version" label={rangeMode === 'between' ? 'From version' : 'Version'} required error={errors.min_version?.message}>
                  <Input placeholder="2.0.4" autoComplete="off" className="font-mono" disabled={busy} {...register('min_version')} />
                </Field>
              )}
              {showMax && (
                <Field id="max_version" label={rangeMode === 'between' ? 'Up to version' : 'Version'} required error={errors.max_version?.message}>
                  <Input placeholder="2.0.3" autoComplete="off" className="font-mono" disabled={busy} {...register('max_version')} />
                </Field>
              )}
            </div>
            <p className="mt-4 rounded-lg bg-muted/60 px-3.5 py-2.5 text-[13px] text-muted-foreground">This rule applies to: <span className="font-medium text-foreground">{describeVersionRange(v.min_version || UNBOUNDED_MIN, v.max_version || null)}</span></p>
          </Section>

          <Section title="Where it goes">
            <div className="space-y-5">
              <Field id="store_choice" label="Which store should open?" required hint={STORE_KIND_HINT[storeChoice].replace(' — ', ': ')}>
                <Choice value={storeChoice} onChange={(k) => changeStore(k as StoreKind)} disabled={busy} options={[...STORE_PRESETS.map((p) => [p.kind, STORE_KIND_LABEL[p.kind]] as [string, string]), ['custom', STORE_KIND_LABEL.custom]]} />
              </Field>
              {storeChoice === 'custom' ? (
                <Field id="base_url" label="Store link" required error={errors.base_url?.message}><Input placeholder="https://store.example.com" autoComplete="off" disabled={busy} {...register('base_url')} /></Field>
              ) : (
                <div>
                  <p className="break-all font-mono text-xs text-muted-foreground">{getStoreHost(v.base_url)}</p>
                  {errors.base_url && <p role="alert" className="mt-1 text-xs text-danger">{errors.base_url.message}</p>}
                </div>
              )}
            </div>
          </Section>

          <Section title="Priority and status">
            <div className="space-y-5">
              <Field id="priority" label="Priority" error={errors.priority?.message} hint="If two rules cover the same version, the higher number is used.">
                <Input type="number" inputMode="numeric" min={0} max={1000} className="max-w-[160px] tabular-nums" disabled={busy} {...register('priority', { valueAsNumber: true })} />
              </Field>
              <div className="rounded-lg border border-border">
                <ToggleRow id="rule_active" label="Rule is on" description="Turn off to stop using this rule." checked={v.is_active} onChange={(c) => setValue('is_active', c, { shouldDirty: true })} disabled={busy} />
              </div>
              <Field id="rule_note" label="Note (optional)" error={errors.description?.message} aside={`${(v.description || '').length}/500`}>
                <Textarea placeholder="Why this rule exists. Only staff see this." rows={2} disabled={busy} {...register('description')} />
              </Field>
            </div>
          </Section>

          <DialogFooter className="sm:items-center">
            {submitError && <p role="alert" className="min-w-0 flex-1 text-[13px] text-danger">{submitError}</p>}
            <Button type="button" variant="outline" className="bg-card" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
              {busy ? 'Saving…' : mode === 'create' ? 'Add Rule' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Choice({ value, onChange, options, disabled, ...aria }: { value: string; onChange: (v: string) => void; options: [string, string][]; disabled?: boolean; id?: string }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger {...aria}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}</SelectContent>
    </Select>
  )
}
