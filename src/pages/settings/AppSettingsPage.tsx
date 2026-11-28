import { useEffect, useMemo, useRef, useState } from 'react'
import { Globe, Loader2, MonitorSmartphone, Phone, Save, Settings, Share2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, Section } from '@/components/common/detail'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ConfirmDock, EditorBar, Field, Notice, Segmented } from '@/components/users/kit'
import { errText, focusFirstError, plural, unwrap, useResource } from '@/components/users/lib'
import { useAuth } from '@/contexts/AuthContext'
import { appSettingsService, type AppSettingRecord } from '@/services/appSettings.service'

/** Which keys belong to which section. */
const SECTIONS = [
  { id: 'general', title: 'General', description: 'Core application settings', icon: Settings, keys: ['maintenance_mode'] },
  { id: 'android_version', title: 'Android Version Control', description: 'Manage minimum required version and force update for Android', icon: Smartphone, keys: ['android_min_version', 'android_store_url', 'android_force_update'] },
  { id: 'ios_version', title: 'iOS Version Control', description: 'Manage minimum required version and force update for iOS', icon: Smartphone, keys: ['ios_min_version', 'ios_store_url', 'ios_force_update'] },
  { id: 'social', title: 'Social Media Links', description: 'Social media profile URLs displayed in the app', icon: Share2, keys: ['instagram_url', 'youtube_url', 'twitter_url'] },
  { id: 'support', title: 'Support Info', description: 'Contact information for user support', icon: Phone, keys: ['whatsapp_support_number', 'whatsapp_support_url', 'support_email', 'support_phone'] },
  { id: 'devices', title: 'Device limit', description: 'How many devices one student can be signed in on at a time', icon: MonitorSmartphone, keys: ['device_limit_max', 'device_limit_action', 'device_limit_count_web'] },
  { id: 'device_switch', title: 'New-device limit', description: 'For students who keep signing in on another device: how many new devices one student can sign in on in a period', icon: MonitorSmartphone, keys: ['device_switch_limit', 'device_switch_window_days'] },
]

const BOOLEAN_KEYS = new Set(['maintenance_mode', 'android_force_update', 'ios_force_update', 'device_limit_count_web'])
/** Shown when the setting was never saved; equal to what the backend assumes. */
const DEFAULTS: Record<string, string> = { device_limit_max: '0', device_limit_action: 'refuse', device_switch_limit: '0', device_switch_window_days: '30' }
/** Whole-number settings: [min, max, value saved when emptied] */
const NUMBER_KEYS: Record<string, [number, number, string]> = {
  device_limit_max: [0, 50, '0'],
  device_switch_limit: [0, 50, '0'],
  device_switch_window_days: [1, 365, '30'],
}
const DEVICE_ACTIONS = [
  { value: 'refuse', label: 'Refuse the new sign-in' },
  { value: 'sign_out_oldest', label: 'Sign out the oldest device' },
] as const
const KNOWN_KEYS = new Set(SECTIONS.flatMap((s) => s.keys))

const KEY_LABELS: Record<string, string> = {
  maintenance_mode: 'Maintenance Mode',
  android_min_version: 'Minimum Version', android_store_url: 'Play Store URL', android_force_update: 'Force Update',
  ios_min_version: 'Minimum Version', ios_store_url: 'App Store URL', ios_force_update: 'Force Update',
  instagram_url: 'Instagram URL', youtube_url: 'YouTube URL', twitter_url: 'X (Twitter) URL',
  whatsapp_support_number: 'WhatsApp Support Number', whatsapp_support_url: 'WhatsApp Support URL', support_email: 'Support Email', support_phone: 'Support Phone',
  device_limit_max: 'Devices per student', device_limit_action: 'At the limit', device_limit_count_web: 'Count web store sign-ins',
  device_switch_limit: 'New devices per period', device_switch_window_days: 'Period (days)',
}
const KEY_DESCRIPTIONS: Record<string, string> = {
  maintenance_mode: 'Flag to enable/disable maintenance mode',
  android_min_version: 'Minimum required Android app version (e.g. 1.6.5). Users below this version will be blocked.',
  android_store_url: 'Google Play Store listing URL for the app',
  android_force_update: 'When enabled, Android users below the minimum version cannot use the app',
  ios_min_version: 'Minimum required iOS app version (e.g. 1.6.5). Users below this version will be blocked.',
  ios_store_url: 'Apple App Store listing URL for the app',
  ios_force_update: 'When enabled, iOS users below the minimum version cannot use the app',
  instagram_url: 'Instagram profile URL', youtube_url: 'YouTube channel URL', twitter_url: 'X (Twitter) profile URL',
  whatsapp_support_number: 'WhatsApp support contact number for user assistance', whatsapp_support_url: 'WhatsApp support chat URL',
  support_email: 'Support email address', support_phone: 'Support phone number',
  device_limit_max: '0 means no limit, as today: the app then asks a student who signs in on a new phone to sign out of the other phone themselves. Up to 50.',
  device_limit_action: 'What happens when a student signs in on one device more than the limit allows',
  device_limit_count_web: 'When on, a browser signed in to the web store takes one of the places. When off, the web store never counts.',
  device_switch_limit: '0 means off, as today. Otherwise a student can sign in on this many devices they have not used in the period; a sign-in on one more new device is refused with a message to contact support. Devices they already use still sign in. Reset a student\'s count on their Devices section. Up to 50.',
  device_switch_window_days: 'How far back sign-ins count: a device signed in on within this many days is not new. 30 if left empty. From 1 to 365.',
}
const ACTION_HINTS: Record<string, string> = {
  refuse: 'The new sign-in is refused. The student sees their devices and can sign one of them out to continue.',
  sign_out_oldest: 'The new sign-in goes through and the device used least recently is signed out, with a message saying why.',
}
/** Switching one of these on can lock students out of the app. */
const RISKY: Record<string, string> = {
  maintenance_mode: 'Maintenance mode closes the app for every student.',
  android_force_update: 'Android students below the minimum version cannot use the app until they update.',
  ios_force_update: 'iPhone and iPad students below the minimum version cannot use the app until they update.',
  device_limit_max: 'A device limit applies from each student\'s next sign-in: a sign-in over the limit is refused or signs out their oldest device. Devices signed in now stay signed in.',
  device_switch_limit: 'A new-device limit applies from each student\'s next sign-in on a new device: once they reach it, sign-ins on more new devices are refused until support resets their count. Devices they already use keep working.',
}
/** Whether saving `value` for `key` needs the "can lock students out" confirmation. */
const isRisky = (key: string, value: string) => !!RISKY[key] && (NUMBER_KEYS[key] ? Number(value) > 0 : value === 'true')

const labelOf = (key: string) => KEY_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/** Empty is fine: it clears the setting. */
function problemWith(key: string, value: string): string | undefined {
  const v = value.trim()
  if (!v) return undefined
  if (/_min_version$/.test(key) && !/^\d+(\.\d+){0,3}$/.test(v)) return 'Use numbers only, e.g. 1.6.5'
  if (/_url$/.test(key) && KNOWN_KEYS.has(key) && !/^https?:\/\/\S+$/i.test(v)) return 'Must be a full link starting with https://'
  if (key === 'support_email' && !/^\S+@\S+\.\S+$/.test(v)) return 'Enter a valid email'
  if (key === 'device_limit_max' && (!/^\d+$/.test(v) || Number(v) > 50)) return 'A whole number from 0 (no limit) to 50'
  if (key === 'device_switch_limit' && (!/^\d+$/.test(v) || Number(v) > 50)) return 'A whole number from 0 (off) to 50'
  if (key === 'device_switch_window_days' && (!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > 365)) return 'A whole number of days from 1 to 365'
  return undefined
}

function initialValues(records: AppSettingRecord[]): Record<string, string> {
  const values: Record<string, string> = {}
  // Empty values for the known keys, so every section always shows
  for (const key of KNOWN_KEYS) values[key] = BOOLEAN_KEYS.has(key) ? 'false' : DEFAULTS[key] ?? ''
  for (const s of records) values[s.key] = s.value ?? ''
  return values
}

export function AppSettingsPage() {
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('settings.update')
  const formRef = useRef<HTMLFormElement>(null)
  const { data: settings, loading, error, status, reload } = useResource<AppSettingRecord[]>(async () => unwrap(await appSettingsService.getAdminAll(), 'Failed to load app settings').settings, [])
  const saved = useMemo(() => (settings ? initialValues(settings) : null), [settings])
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showProblems, setShowProblems] = useState(false)
  const [confirmRisk, setConfirmRisk] = useState(false)

  useEffect(() => { if (saved) setValues(saved) }, [saved])

  const changed = saved ? Object.keys(values).filter((k) => values[k] !== (saved[k] ?? '')) : []
  const problems = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, problemWith(k, v)]).filter(([, p]) => p)) as Record<string, string>
  const risky = changed.filter((k) => isRisky(k, values[k]))
  useUnsavedChanges(changed.length > 0 && !saving)

  const set = (key: string, value: string) => { setSubmitError(null); setValues((prev) => ({ ...prev, [key]: value })) }

  const save = async () => {
    if (!settings || saving) return
    setSaving(true)
    setSubmitError(null)
    try {
      // Only what changed here, so a setting saved by someone else meanwhile is not put back
      const payload = changed
        .filter((key) => values[key] !== '' || settings.some((s) => s.key === key))
        .map((key) => {
          const value = values[key]
          const description = settings.find((s) => s.key === key)?.description || KEY_DESCRIPTIONS[key]
          // An emptied device limit means "no limit"; an emptied period means the default
          const clean = BOOLEAN_KEYS.has(key) ? value : NUMBER_KEYS[key] && !value.trim() ? NUMBER_KEYS[key][2] : value.trim()
          return { key, value: clean, ...(description ? { description } : {}) }
        })
      unwrap(await appSettingsService.bulkUpdate(payload), 'Failed to save settings')
      toast.success('Settings saved successfully')
      setShowProblems(false)
      await reload({ silent: true })
    } catch (err) {
      setSubmitError(errText(err, 'Failed to save settings'))
    } finally {
      setSaving(false)
    }
  }

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!changed.length || saving) return
    if (changed.some((k) => problems[k])) { setShowProblems(true); focusFirstError(formRef.current); return }
    if (risky.length) { setConfirmRisk(true); return }
    void save()
  }

  const header = (
    <PageHeader
      title="App Settings"
      description="Manage platform configuration settings"
      breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Settings' }, { label: 'App Settings' }]}
      action={canUpdate && settings ? (
        <Button onClick={() => submit()} disabled={saving || changed.length === 0}>
          {saving ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      ) : undefined}
    />
  )

  if (!settings) {
    return (
      <div className="space-y-6">
        {header}
        {loading ? <div role="status" aria-label="Loading settings" className="space-y-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
          : <ErrorState title={status === 403 ? 'You do not have access to app settings' : 'The settings could not be loaded'} message={error ?? undefined} onRetry={status === 403 ? undefined : () => reload()} />}
      </div>
    )
  }

  // student_profile_fields is edited on Settings > Student Profile Fields (raw JSON here would only invite mistakes)
  const otherKeys = Object.keys(values).filter((k) => !KNOWN_KEYS.has(k) && k !== 'student_profile_fields')

  const renderField = (key: string) => {
    const value = values[key] ?? ''
    const description = settings.find((s) => s.key === key)?.description || KEY_DESCRIPTIONS[key] || ''
    if (BOOLEAN_KEYS.has(key)) {
      return (
        <div key={key} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <Label htmlFor={key} className="text-sm font-medium">{labelOf(key)}</Label>
            {description && <p id={`${key}-desc`} className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          <Switch id={key} checked={value === 'true'} onCheckedChange={(c) => set(key, c ? 'true' : 'false')} disabled={!canUpdate || saving} aria-describedby={description ? `${key}-desc` : undefined} />
        </div>
      )
    }
    const problem = (showProblems || changed.includes(key)) ? problems[key] : undefined
    if (key === 'device_limit_action') {
      const current = value === 'sign_out_oldest' ? 'sign_out_oldest' : 'refuse'
      return (
        <div key={key} className="space-y-1.5 py-3.5 first:pt-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-2">
            <span id={`${key}-label`} className="text-[13px] font-medium">{labelOf(key)}</span>
            {changed.includes(key) && <span className="text-xs text-muted-foreground">Changed</span>}
          </div>
          <Segmented label={labelOf(key)} value={current} onChange={(v) => set(key, v)} options={[...DEVICE_ACTIONS]} disabled={!canUpdate || saving} />
          <p className="text-xs text-muted-foreground">{ACTION_HINTS[current]}{values.device_limit_max === '0' || !values.device_limit_max ? ' Applies once a limit is set above.' : ''}</p>
        </div>
      )
    }
    if (NUMBER_KEYS[key]) {
      const [min, max] = NUMBER_KEYS[key]
      return (
        <div key={key} className="py-3.5 first:pt-0 last:pb-0">
          <Field id={key} label={labelOf(key)} hint={description || undefined} error={problem} aside={changed.includes(key) ? 'Changed' : undefined}>
            <Input type="number" inputMode="numeric" min={min} max={max} step={1} value={value} onChange={(e) => set(key, e.target.value)} disabled={!canUpdate || saving} autoComplete="off" className="w-32 font-mono text-sm tabular-nums" />
          </Field>
          {key === 'device_switch_window_days' && (values.device_switch_limit === '0' || !values.device_switch_limit) && <p className="mt-1 text-xs text-muted-foreground">Applies once a number of new devices is set above.</p>}
        </div>
      )
    }
    return (
      <div key={key} className="py-3.5 first:pt-0 last:pb-0">
        <Field id={key} label={labelOf(key)} hint={description || undefined} error={problem} aside={changed.includes(key) ? 'Changed' : undefined}>
          <Input value={value} onChange={(e) => set(key, e.target.value)} disabled={!canUpdate || saving} autoComplete="off" className="font-mono text-sm" />
        </Field>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="relative">
      <div className="space-y-6">
        {header}
        {!canUpdate && <Notice tone="info">You can see these settings but not change them.</Notice>}
        {SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <Section key={section.id} title={<span className="flex items-center gap-2"><Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />{section.title}</span>} description={section.description}>
              <div className="divide-y divide-border">{section.keys.map(renderField)}</div>
            </Section>
          )
        })}
        {otherKeys.length > 0 && (
          <Section title={<span className="flex items-center gap-2"><Globe aria-hidden="true" className="h-4 w-4 text-muted-foreground" />Other</span>} description="Additional settings">
            <div className="divide-y divide-border">{otherKeys.map(renderField)}</div>
          </Section>
        )}
      </div>
      {canUpdate && (changed.length > 0 || submitError) && (
        <EditorBar
          submitLabel="Save Changes" savingLabel="Saving…" saving={saving} error={submitError} icon={Save}
          note={`${plural(changed.length, 'setting')} changed, not saved yet.`}
          extra={<Button type="button" variant="outline" className="bg-card" disabled={saving} onClick={() => { if (saved) setValues(saved); setSubmitError(null); setShowProblems(false) }}>Undo changes</Button>}
        />
      )}
      <ConfirmDock
        open={confirmRisk} onClose={() => setConfirmRisk(false)} onConfirm={async () => { setConfirmRisk(false); await save() }}
        title="This can lock students out" description={<ul className="list-disc space-y-1 pl-5">{risky.map((k) => <li key={k}>{RISKY[k]}</li>)}</ul>}
        confirmLabel="Save anyway" workingLabel="Saving…"
      />
    </form>
  )
}
