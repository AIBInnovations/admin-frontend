import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Loader2, LogOut, Monitor, RotateCcw, Smartphone, Tablet } from 'lucide-react'
import { Section, StatusPill } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { dayTimeIST, errStatus, errText, plural, unwrap, useResource } from '@/components/users/lib'
import { relativeTime } from '@/lib/relativeTime'
import { devicesService, type DeviceEndReason, type DevicePolicy, type DeviceSwitchLimit, type StudentDevice, type StudentDevices } from '@/services/devices.service'
import type { DeviceSession } from '@/services/users.service'

const ICON: Record<string, typeof Monitor> = { iOS: Smartphone, Android: Smartphone, Tablet, Web: Monitor }
const NOTE_MAX = 500

const ENDED: Record<DeviceEndReason, string> = {
  signed_out_by_admin: 'Signed out by an admin',
  device_limit: 'Signed out at the device limit',
  signed_out_elsewhere: 'Signed out from another of their devices',
  signed_out: 'Signed out on this device',
  expired: 'Idle too long, sign-in expired',
  session_ended: 'Signed out (reason not recorded)',
}

/** How the device policy reads for an admin. */
export function policyLine(policy: DevicePolicy | undefined): string {
  if (!policy || !policy.enabled) return 'Device limit is off. The app asks students to sign out of other phones themselves.'
  const devices = plural(policy.max_devices, 'device')
  const action = policy.action === 'sign_out_oldest' ? 'the least recently used device is signed out' : 'new sign-ins are refused'
  return `Device limit: ${devices}; at the limit ${action}. Web store sign-ins ${policy.count_web_store ? 'count' : 'do not count'}.`
}

/** The new-device limit as it stands for this student. */
export function switchLine(sw: DeviceSwitchLimit | undefined): string | null {
  if (!sw) return null
  if (!sw.enabled) return sw.used > 0 ? `New-device limit is off (${plural(sw.used, 'new device')} in the last ${sw.window_days} days).` : null
  const used = `${sw.used} of ${sw.limit} new ${sw.limit === 1 ? 'device' : 'devices'} used in the last ${plural(sw.window_days, 'day')}`
  if (!sw.reached) return `New-device limit: ${used}.`
  return `New-device limit reached: ${used}. Sign-ins on another new device are refused${sw.next_free_at ? ` until ${dayTimeIST(sw.next_free_at)}` : ''}.`
}

/** The rows the user record already carries, for an older backend without the devices endpoint. */
function fromUserRecord(rows: DeviceSession[]): StudentDevice[] {
  return [...rows]
    .sort((a, b) => Number(b.is_active) - Number(a.is_active) || new Date(b.last_active).getTime() - new Date(a.last_active).getTime())
    .map((d) => ({
      session_id: d._id, device_id: d.device_id, device_name: d.device_name, device_type: d.device_type, client: 'app',
      first_seen_at: (d as DeviceSession & { createdAt?: string }).createdAt ?? d.login_time ?? null,
      last_active: d.last_active, login_time: d.login_time, is_active: d.is_active, counts_toward_limit: d.is_active,
      ended_at: null, ended_reason: null, ended_by_admin_name: null, ended_note: null, login_refused_at: null, audit: [],
    }))
}

type Target = { kind: 'one'; device: StudentDevice } | { kind: 'all' } | { kind: 'reset' }

/**
 * The "Device Sessions" section of the student page: every device the student
 * signed in on, first and last seen (IST), active or not and why it ended,
 * with "Sign out this device" and "Sign out all devices" (users.update), each
 * confirmed inline with a note that is saved with the sign-out.
 */
export function DeviceSessionsSection({ userId, fallback, canUpdate, title }: {
  userId: string
  /** `device_sessions` of the user record, shown when the devices endpoint is missing. */
  fallback: DeviceSession[]
  canUpdate: boolean
  title: (count: number) => ReactNode
}) {
  const { data, loading, error, status, reload } = useResource<StudentDevices>(
    async () => unwrap(await devicesService.list(userId), 'Devices could not be loaded'), [userId],
  )
  // An older backend has no devices endpoint: show the user record's rows, read-only.
  const legacy = !data && !loading && (status === 404 || status === 405)
  const devices = data?.devices ?? (legacy || error ? fromUserRecord(fallback) : [])
  const actions = canUpdate && !!data
  const [target, setTarget] = useState<Target | null>(null)
  const [announce, setAnnounce] = useState('')
  const active = devices.filter((d) => d.is_active).length
  const sw = data?.switch_limit
  const swLine = switchLine(sw)
  const canReset = actions && !!sw && sw.used > 0

  const done = async (message: string) => {
    setTarget(null)
    setAnnounce(message)
    toast.success(message)
    await reload({ silent: true })
  }

  return (
    <Section
      flush
      title={title(devices.length)}
      description={data ? (
        <>
          {`${plural(active, 'active device')}. ${policyLine(data.policy)}`}
          {swLine && <span className={sw?.reached ? 'mt-0.5 block font-medium text-warning' : 'mt-0.5 block'}>{swLine}{sw?.last_reset ? ` Count last reset ${dayTimeIST(sw.last_reset.at)}${sw.last_reset.admin_name ? ` by ${sw.last_reset.admin_name}` : ''}.` : ''}</span>}
        </>
      ) : undefined}
      action={actions ? (
        <div className="flex flex-wrap gap-2">
          {canReset && (
            <Button variant="outline" size="sm" onClick={() => setTarget({ kind: 'reset' })} disabled={target?.kind === 'reset'}>
              <RotateCcw aria-hidden="true" />Reset new-device count
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setTarget({ kind: 'all' })} disabled={target?.kind === 'all'}>
            <LogOut aria-hidden="true" />Sign out all devices
          </Button>
        </div>
      ) : undefined}
    >
      <p className="sr-only" aria-live="polite">{announce}</p>
      {error && !legacy && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-warning-soft px-5 py-2.5 text-sm text-warning">
          <span>Device details could not be loaded{data ? '; showing the last loaded list' : ''}. {error}</span>
          <Button size="sm" variant="outline" className="bg-card" onClick={() => reload()}>Try again</Button>
        </div>
      )}
      {target?.kind === 'reset' && sw && (
        <ResetPanel
          limit={sw}
          onCancel={() => setTarget(null)}
          onConfirm={async (note) => {
            unwrap(await devicesService.resetSwitchLimit(userId, note), 'The count was not reset')
            await done('New-device count reset')
          }}
        />
      )}
      {target && target.kind !== 'reset' && (
        <SignOutPanel
          key={target.kind === 'one' ? target.device.session_id : 'all'}
          target={target}
          activeCount={active}
          onCancel={() => setTarget(null)}
          onConfirm={async (note) => {
            if (target.kind === 'one') {
              const res = unwrap(await devicesService.signOut(userId, target.device.session_id, note), 'The device was not signed out')
              await done(res.already_signed_out ? `${target.device.device_name} was already signed out` : `${target.device.device_name} signed out`)
            } else {
              const res = unwrap(await devicesService.signOutAll(userId, note), 'The devices were not signed out')
              await done(res.signed_out > 0 ? `Signed out ${plural(res.signed_out, 'device')}` : 'Signed out older sign-ins; no device was signed in')
            }
          }}
        />
      )}
      {loading && !data && !error ? (
        <div role="status" aria-label="Loading devices" className="space-y-2 border-t border-border px-5 py-4">
          {[0, 1].map((i) => <Skeleton key={i} className="h-9 rounded-md" />)}
        </div>
      ) : devices.length === 0 ? (
        <div className="border-t border-border px-5 py-9 text-center text-sm text-muted-foreground">
          <Monitor aria-hidden="true" className="mx-auto mb-2 h-7 w-7 opacity-40" />
          No device sessions
          {data?.last_signed_out_all && <p className="mt-1 text-xs">All devices were signed out {dayTimeIST(data.last_signed_out_all.at)}{data.last_signed_out_all.admin_name ? ` by ${data.last_signed_out_all.admin_name}` : ''}.</p>}
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-border">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {['Device', 'Type', 'First Seen', 'Last Active', 'Status', ''].map((h, i, all) => (
                  <TableHead key={i} scope="col" className={i === 0 ? 'pl-5' : i === all.length - 1 ? 'pr-5' : ''}>{h || <span className="sr-only">Actions</span>}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((d) => {
                const Icon = ICON[d.device_type] ?? Monitor
                const cells: ReactNode[] = [
                  <div key="n" className="max-w-[300px]">
                    <p className="break-words text-sm font-medium">{d.device_name || 'Unnamed device'}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.client === 'web_store' ? 'Web store' : 'App'}
                      {data?.policy.enabled && d.is_active && <> · {d.counts_toward_limit ? 'counts toward the limit' : 'does not count toward the limit'}</>}
                    </p>
                    {/* Phones: the Status column is off to the side, so say it here too */}
                    <p className="mt-1 md:hidden" aria-hidden="true"><StatusPill tone={d.is_active ? 'success' : 'neutral'}>{d.is_active ? 'Active' : 'Inactive'}</StatusPill></p>
                  </div>,
                  <span key="t" className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground"><Icon aria-hidden="true" className="h-4 w-4" />{d.device_type}</span>,
                  <span key="f" className="whitespace-nowrap text-xs text-muted-foreground">{dayTimeIST(d.first_seen_at)}</span>,
                  <span key="l" className="whitespace-nowrap text-xs text-muted-foreground" title={d.last_active ? relativeTime(d.last_active) : undefined}>{dayTimeIST(d.last_active)}</span>,
                  <StatusCell key="s" device={d} />,
                  actions && d.is_active ? (
                    <div key="b" className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 whitespace-nowrap px-2 text-xs text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setTarget({ kind: 'one', device: d })} aria-label={`Sign out ${d.device_name || 'this device'}`}>
                        <LogOut aria-hidden="true" className="!size-3" />Sign out
                      </Button>
                    </div>
                  ) : null,
                ]
                return (
                  <TableRow key={d.session_id} className="hover:bg-transparent">
                    {cells.map((c, i, all) => <TableCell key={i} className={i === 0 ? 'py-2.5 pl-5 align-top' : i === all.length - 1 ? 'py-2.5 pr-5 align-top' : 'py-2.5 align-top'}>{c}</TableCell>)}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Section>
  )
}

function StatusCell({ device: d }: { device: StudentDevice }) {
  if (d.is_active) return <StatusPill tone="success">Active</StatusPill>
  const why = d.ended_reason ? ENDED[d.ended_reason] ?? 'Signed out' : null
  const who = d.ended_reason === 'signed_out_by_admin' && d.ended_by_admin_name ? `By ${d.ended_by_admin_name}` : null
  return (
    <div className="max-w-[260px] space-y-0.5">
      <StatusPill tone="neutral">Inactive</StatusPill>
      {why && <p className="text-xs text-muted-foreground">{why}{d.ended_at ? `, ${dayTimeIST(d.ended_at)}` : ''}</p>}
      {who && <p className="text-xs text-muted-foreground">{who}</p>}
      {d.ended_note && <p className="break-words text-xs text-muted-foreground" title={d.ended_note}>Note: {d.ended_note}</p>}
      {d.login_refused_at && <p className="text-xs text-warning">{d.login_refused_reason === 'device_switch_limit' ? 'Sign-in refused at the new-device limit' : 'Sign-in refused at the device limit'}, {dayTimeIST(d.login_refused_at)}</p>}
    </div>
  )
}

/** Inline confirmation for "Reset new-device count", with a note for the record. */
function ResetPanel({ limit, onCancel, onConfirm }: {
  limit: DeviceSwitchLimit
  onCancel: () => void
  onConfirm: (note?: string) => Promise<void>
}) {
  const [note, setNote] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const noteId = useId()
  const headingId = useId()

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    ref.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true })
  }, [])

  const run = async () => {
    if (working) return
    setWorking(true)
    setError(null)
    try {
      await onConfirm(note.trim() || undefined)
    } catch (err) {
      setError(errStatus(err) === 403 ? 'You do not have permission to reset the count.' : errText(err, 'The count was not reset. Please try again.'))
      setWorking(false)
    }
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={headingId}
      className="scroll-mt-4 space-y-3 border-t border-border bg-muted/30 px-5 py-4"
      onKeyDown={(e) => { if (e.key === 'Escape' && !working) onCancel() }}
    >
      <div>
        <h3 id={headingId} className="text-sm font-semibold">Reset the new-device count?</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {`The ${plural(limit.used, 'new device')} counted so far stop counting, so the student can sign in on ${limit.enabled ? plural(limit.limit, 'new device') : 'new devices'} again before the limit applies. Nobody is signed out.`}
        </p>
      </div>
      <div className="space-y-1">
        <label htmlFor={noteId} className="text-xs font-medium">Note for the record <span className="font-normal text-muted-foreground">(optional)</span></label>
        <Textarea id={noteId} value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} placeholder="Why, for example: changed phone, checked with the student" rows={2} disabled={working} className="bg-card" />
        <p className="text-right text-xs tabular-nums text-muted-foreground">{note.length}/{NOTE_MAX}</p>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={run} disabled={working}>
          {working ? <Loader2 aria-hidden="true" className="animate-spin" /> : <RotateCcw aria-hidden="true" />}
          {working ? 'Resetting…' : 'Reset count'}
        </Button>
        <Button variant="outline" size="sm" className="bg-card" onClick={onCancel} disabled={working}>Cancel</Button>
      </div>
    </div>
  )
}

function SignOutPanel({ target, activeCount, onCancel, onConfirm }: {
  target: Exclude<Target, { kind: 'reset' }>
  activeCount: number
  onCancel: () => void
  onConfirm: (note?: string) => Promise<void>
}) {
  const [note, setNote] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const noteId = useId()
  const headingId = useId()

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    ref.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true })
  }, [])

  const one = target.kind === 'one'
  const name = one ? target.device.device_name || 'this device' : null
  const run = async () => {
    if (working) return
    setWorking(true)
    setError(null)
    try {
      await onConfirm(note.trim() || undefined)
    } catch (err) {
      setError(errStatus(err) === 403 ? 'You do not have permission to sign out devices.' : errText(err, 'The sign-out did not go through. Please try again.'))
      setWorking(false)
    }
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={headingId}
      className="scroll-mt-4 space-y-3 border-t border-border bg-muted/30 px-5 py-4"
      onKeyDown={(e) => { if (e.key === 'Escape' && !working) onCancel() }}
    >
      <div>
        <h3 id={headingId} className="text-sm font-semibold">{one ? `Sign out ${name}?` : 'Sign out all devices?'}</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {one
            ? 'The student is asked to sign in again on this device, with a message that support signed it out. Their purchases are not affected.'
            : `${activeCount > 0 ? `The student is signed out on ${plural(activeCount, 'device')}` : 'No device is signed in right now'}, and older sign-ins from before device tracking end too. They can sign in again.`}
        </p>
      </div>
      <div className="space-y-1">
        <label htmlFor={noteId} className="text-xs font-medium">Note for the record <span className="font-normal text-muted-foreground">(optional)</span></label>
        <Textarea
          id={noteId}
          value={note}
          maxLength={NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why, for example: lost phone, reported by the student"
          rows={2}
          disabled={working}
          className="bg-card"
        />
        <p className="text-right text-xs tabular-nums text-muted-foreground">{note.length}/{NOTE_MAX}</p>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" size="sm" onClick={run} disabled={working}>
          {working ? <Loader2 aria-hidden="true" className="animate-spin" /> : <LogOut aria-hidden="true" />}
          {working ? 'Signing out…' : one ? 'Sign out device' : 'Sign out all devices'}
        </Button>
        <Button variant="outline" size="sm" className="bg-card" onClick={onCancel} disabled={working}>Cancel</Button>
      </div>
    </div>
  )
}
