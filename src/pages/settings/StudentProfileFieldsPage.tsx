import { useEffect, useMemo, useRef, useState } from 'react'
import { Globe, Lock, RotateCcw, Save, Smartphone, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, Section, StatusPill, apiErrorInfo } from '@/components/common/detail'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EditorBar, Notice, Segmented } from '@/components/users/kit'
import { errText, plural, unwrap, useResource } from '@/components/users/lib'
import { useAuth } from '@/contexts/AuthContext'
import { formatDayTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { profileFieldsService, type ProfileField, type ProfileFieldRule, type ProfileFieldsConfig } from '@/services/profileFields.service'

/**
 * Settings > Student Profile Fields (Aviraj, 28 Nov 2026): which details a
 * student fills in at first sign-in (app) and before buying (website), and
 * which of them are required. The server enforces the same rules.
 */

const RULE_OPTIONS: { value: ProfileFieldRule; label: string }[] = [
  { value: 'required', label: 'Required' },
  { value: 'optional', label: 'Optional' },
  { value: 'off', label: 'Not asked' },
]
const RULE_WORD: Record<ProfileFieldRule, string> = { required: 'Required', optional: 'Optional', off: 'Not asked' }

/** What each field is, in a line. */
const HINTS: Record<string, string> = {
  name: 'Asked at first sign-in. The student can edit it later.',
  phone_number: 'The number the student signs in with. It is never asked again and cannot be changed.',
  student_id: 'Made automatically (PGME0001, PGME0002 and so on). It cannot be changed.',
  email: 'Asked at first sign-in. It cannot be changed afterwards.',
  date_of_birth: 'Students must be 18 or older.',
  gender: 'Male, female or other.',
  address: 'Picked on a map in the app; typed on the website.',
  ug_college: 'Where the student did their undergraduate (MBBS) degree.',
  pg_college: 'Where the student did, or is doing, their postgraduate degree.',
  affiliated_organisation: 'The hospital or institution the student works with.',
  current_designation: 'The student\'s current role, for example Resident.',
}

function FixedRule({ field }: { field: ProfileField }) {
  const text = field.source === 'sign_in' ? 'From sign-in' : field.source === 'auto' ? 'Made automatically' : 'Always required'
  return (
    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
      <StatusPill tone="neutral">{text}</StatusPill>
      {!field.editable_after_signup && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Lock aria-hidden="true" className="h-3.5 w-3.5" />Cannot be changed later
        </span>
      )}
    </div>
  )
}

function FieldsSkeleton() {
  return (
    <div role="status" aria-label="Loading profile fields" className="space-y-6">
      {[4, 7].map((rows, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="mb-4 h-5 w-40" />
          <div className="space-y-4">
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="flex items-center justify-between gap-4">
                <div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-56" /></div>
                <Skeleton className="h-9 w-64 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** The grey text inside each preview box, as the app shows it. */
const PREVIEW_HINTS: Record<string, string> = {
  first_name: 'Enter your first name',
  last_name: 'Enter your last name',
  name: 'Enter your full name',
  email: 'Enter your email',
  date_of_birth: 'DD/MM/YYYY',
  gender: 'Select your gender',
  address: 'Tap to pick your address',
  ug_college: 'Enter your UG college',
  pg_college: 'Enter your PG college',
  affiliated_organisation: 'Enter your organisation',
  current_designation: 'Enter your designation',
}

/** A field as it looks on the student's form, with its marker. */
function PreviewField({ label, rule, locked, value, hint }: { label: string; rule: ProfileFieldRule; locked?: boolean; value?: string; hint?: string }) {
  return (
    <li className="space-y-1">
      <p className="text-[12px] font-medium text-foreground">
        {label}
        {!locked && rule === 'required' && <span className="ml-0.5 text-danger" aria-label="required">*</span>}
        {!locked && rule === 'optional' && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
      </p>
      <div className={cn('flex h-9 items-center justify-between gap-2 rounded-md border border-border px-3 text-[12px]', locked ? 'bg-muted text-muted-foreground' : 'bg-card text-muted-foreground/70')}>
        <span className="truncate">{value ?? hint ?? ''}</span>
        {locked && <Lock aria-label="cannot be changed" className="h-3.5 w-3.5 shrink-0" />}
      </div>
    </li>
  )
}

function Preview({ fields, rules, view }: { fields: ProfileField[]; rules: Record<string, ProfileFieldRule>; view: 'signup' | 'edit' }) {
  const asked = fields.filter((f) => f.configurable && (rules[f.key] ?? f.rule) !== 'off')
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]))
  const label = (key: string, fallback: string) => byKey[key]?.label ?? fallback
  return (
    <div className="mx-auto w-full max-w-[320px] rounded-2xl border border-border bg-background p-4 shadow-card">
      <p className="text-center font-display text-[15px] font-semibold">{view === 'signup' ? 'Complete your account' : 'Edit Profile'}</p>
      {view === 'signup' && <p className="mt-0.5 text-center text-[12px] text-muted-foreground">Tell us a bit about yourself</p>}
      <ol className="mt-4 space-y-3" aria-label={view === 'signup' ? 'Fields on the first sign-in form' : 'Fields on the edit profile screen'}>
        {view === 'signup' ? (
          <>
            <PreviewField label="First Name" rule="required" hint={PREVIEW_HINTS.first_name} />
            <PreviewField label="Last Name" rule="required" hint={PREVIEW_HINTS.last_name} />
            <PreviewField label={label('email', 'Email')} rule="required" hint={PREVIEW_HINTS.email} />
          </>
        ) : (
          <>
            <PreviewField label={label('name', 'Full Name')} rule="required" hint={PREVIEW_HINTS.name} />
            <PreviewField label={label('phone_number', 'Phone Number')} rule="required" locked value="98765 43210" />
            <PreviewField label={label('student_id', 'Student ID')} rule="required" locked value="PGME0042" />
            <PreviewField label={label('email', 'Email')} rule="required" locked value="student@example.com" />
          </>
        )}
        {asked.map((f) => <PreviewField key={f.key} label={f.label} rule={rules[f.key] ?? f.rule} hint={PREVIEW_HINTS[f.key]} />)}
      </ol>
      <div className="mt-4 flex h-9 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground" aria-hidden="true">
        {view === 'signup' ? 'Sign Up' : 'Save Changes'}
      </div>
    </div>
  )
}

export function StudentProfileFieldsPage() {
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('settings.update')
  const formRef = useRef<HTMLFormElement>(null)
  const { data, loading, error, status, reload, setData } = useResource<ProfileFieldsConfig>(
    async () => unwrap(await profileFieldsService.get(), 'The profile fields could not be loaded'),
    [],
  )
  const [rules, setRules] = useState<Record<string, ProfileFieldRule>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [view, setView] = useState<'signup' | 'edit'>('signup')

  const saved = useMemo(() => (data ? Object.fromEntries(data.fields.map((f) => [f.key, f.rule])) as Record<string, ProfileFieldRule> : null), [data])
  useEffect(() => { if (saved) setRules(saved) }, [saved])

  const configurable = data?.fields.filter((f) => f.configurable) ?? []
  const fixed = data?.fields.filter((f) => !f.configurable) ?? []
  const changed = saved ? configurable.filter((f) => rules[f.key] && rules[f.key] !== saved[f.key]) : []
  const offDefault = configurable.filter((f) => (rules[f.key] ?? f.rule) !== f.default_rule)
  const requiredCount = configurable.filter((f) => (rules[f.key] ?? f.rule) === 'required').length + fixed.filter((f) => f.source === 'student').length
  useUnsavedChanges(changed.length > 0 && !saving)

  const setRule = (key: string, rule: ProfileFieldRule) => { setSubmitError(null); setRules((prev) => ({ ...prev, [key]: rule })) }

  const save = async () => {
    if (!data || saving || !changed.length) return
    setSaving(true)
    setSubmitError(null)
    try {
      const payload = configurable.map((f) => ({ key: f.key, rule: rules[f.key] ?? f.rule }))
      const next = unwrap(await profileFieldsService.save(payload, data.updated_at), 'The profile fields were not saved')
      setData(next)
      setStale(false)
      toast.success(`Profile fields saved: ${plural(changed.length, 'change')}`)
    } catch (err) {
      const info = apiErrorInfo(err)
      if (info.status === 409) setStale(true)
      setSubmitError(errText(err, 'The profile fields were not saved'))
    } finally {
      setSaving(false)
    }
  }

  const submit = (e?: React.FormEvent) => { e?.preventDefault(); void save() }

  const header = (
    <PageHeader
      title="Student Profile Fields"
      description="What students fill in at their first sign-in to the app, and on the website before they buy."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Settings' }, { label: 'Student Profile Fields' }]}
      action={canUpdate && data ? (
        <Button onClick={() => submit()} disabled={saving || changed.length === 0}>
          <Save aria-hidden="true" />{saving ? 'Saving…' : 'Save changes'}
        </Button>
      ) : undefined}
    />
  )

  if (!data) {
    return (
      <div className="space-y-6">
        {header}
        {loading ? <FieldsSkeleton />
          : <ErrorState title={status === 403 ? 'You do not have access to the profile fields' : 'The profile fields could not be loaded'} message={error ?? undefined} onRetry={status === 403 ? undefined : () => reload()} />}
      </div>
    )
  }

  const lastSaved = data.updated_at
    ? `Last saved ${formatDayTime(data.updated_at)} IST${data.updated_by_name ? ` by ${data.updated_by_name}` : ''}.`
    : 'Never changed: the defaults apply.'

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="relative">
      <div className="space-y-6">
        {header}
        {!canUpdate && <Notice tone="info">You can see these rules but not change them.</Notice>}
        {stale && (
          <Notice tone="warning" title="Someone else saved a change">
            <span>Reload to see it, then make your change again. </span>
            <Button type="button" size="sm" variant="outline" className="mt-2 bg-card" onClick={() => { setSubmitError(null); setStale(false); void reload() }}>Reload</Button>
          </Notice>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="min-w-0 space-y-6">
            <Section
              title={<span className="flex items-center gap-2"><UserRound aria-hidden="true" className="h-4 w-4 text-muted-foreground" />Profile details</span>}
              description="Required: the student must fill it in. Optional: asked, may be left empty. Not asked: hidden from students."
              action={canUpdate && offDefault.length > 0 ? (
                <Button type="button" size="sm" variant="outline" className="bg-card" disabled={saving}
                  onClick={() => { setSubmitError(null); setRules((prev) => ({ ...prev, ...Object.fromEntries(configurable.map((f) => [f.key, f.default_rule])) })) }}>
                  <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />Use the defaults
                </Button>
              ) : undefined}
              flush
            >
              <ul className="divide-y divide-border border-t border-border">
                {configurable.map((f) => {
                  const rule = rules[f.key] ?? f.rule
                  const isChanged = saved ? rule !== saved[f.key] : false
                  return (
                    <li key={f.key} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
                          <span id={`pf-${f.key}`}>{f.label}</span>
                          {isChanged && <StatusPill tone="info">Changed</StatusPill>}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {HINTS[f.key] ?? ''}{' '}
                          {f.editable_after_signup ? 'Editable later.' : 'Cannot be changed later.'}
                          {rule !== f.default_rule && <> Default: {RULE_WORD[f.default_rule].toLowerCase()}.</>}
                        </p>
                      </div>
                      <Segmented
                        label={`${f.label}: required, optional or not asked`}
                        value={rule}
                        onChange={(v) => setRule(f.key, v)}
                        options={RULE_OPTIONS}
                        disabled={!canUpdate || saving}
                        className="shrink-0"
                      />
                    </li>
                  )
                })}
              </ul>
            </Section>

            <Section
              title={<span className="flex items-center gap-2"><Lock aria-hidden="true" className="h-4 w-4 text-muted-foreground" />Always the same</span>}
              description="These cannot be switched off. The phone number is the single source of truth for an account."
              flush
            >
              <ul className="divide-y divide-border border-t border-border">
                {fixed.map((f) => (
                  <li key={f.key} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{HINTS[f.key] ?? ''}</p>
                    </div>
                    <FixedRule field={f} />
                  </li>
                ))}
              </ul>
            </Section>

            <Notice tone="info" title="When students are asked">
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>In the app, once: at the first sign-in. Students who already signed up are not asked again.</li>
                <li>On the website, before paying: only when a required field is missing from the student&apos;s profile.</li>
                <li>Later, students can edit everything here except the phone number, student ID and email.</li>
              </ul>
              <p className="mt-2 text-muted-foreground">{lastSaved}</p>
            </Notice>
          </div>

          <aside className="min-w-0 xl:sticky xl:top-4" aria-label="Preview">
            <Section
              title={changed.length ? 'Preview of your changes' : 'What students see'}
              description={`${plural(requiredCount, 'required field')} on the form.`}
            >
              <div className="space-y-4">
                <Segmented
                  label="Preview"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: 'signup', label: 'First sign-in', icon: Smartphone },
                    { value: 'edit', label: 'Edit profile', icon: UserRound },
                  ]}
                  className="mx-auto"
                />
                <Preview fields={data.fields} rules={rules} view={view} />
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Globe aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  The website shows the same fields at checkout, only the ones the student has not filled in yet.
                </p>
              </div>
            </Section>
          </aside>
        </div>
      </div>

      {canUpdate && (changed.length > 0 || submitError) && (
        <EditorBar
          submitLabel="Save changes" savingLabel="Saving…" saving={saving} error={submitError} icon={Save}
          disabled={changed.length === 0}
          note={`${plural(changed.length, 'field')} changed, not saved yet. New sign-ups follow the saved rules.`}
          extra={<Button type="button" variant="outline" className="bg-card" disabled={saving} onClick={() => { if (saved) setRules(saved); setSubmitError(null) }}>Undo changes</Button>}
        />
      )}
    </form>
  )
}
