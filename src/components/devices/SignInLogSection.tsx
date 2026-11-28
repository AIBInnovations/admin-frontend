import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Download, History, Loader2, Monitor, Smartphone, Tablet } from 'lucide-react'
import { Section, StatusPill } from '@/components/common/detail'
import { DateRangeFilter, presetRange, rangeLabel, type DateRange } from '@/components/common/DateRangeFilter'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { dayTimeIST, errText, plural, unwrap, useResource } from '@/components/users/lib'
import { relativeTime } from '@/lib/relativeTime'
import { devicesService, type SignInLog, type SignInLogEntry } from '@/services/devices.service'

const ICON: Record<string, typeof Monitor> = { iOS: Smartphone, Android: Smartphone, Tablet, Web: Monitor }
const PLATFORM: Record<string, string> = { iOS: 'iOS', Android: 'Android', Web: 'Web', Tablet: 'Tablet' }
const PAGE_SIZE = 25
const isDay = (v: string | null) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** The log's range in the URL (log_from / log_to / log_range), so Back and sharing keep it. */
function rangeFrom(params: URLSearchParams): DateRange {
  const from = params.get('log_from'); const to = params.get('log_to')
  if (isDay(from) && isDay(to) && from! <= to!) return { from: from!, to: to!, preset: 'custom' }
  const preset = params.get('log_range')
  return presetRange(preset && preset !== 'custom' ? preset : 'all')
}

/**
 * The student's sign-in log (Aviraj, 28 Nov 2026: "log in, active, log out"):
 * each sign-in with its device and platform, when it was last active, and
 * when and why it was signed out; refused sign-ins too. IST. Exports as CSV.
 * Nothing about what the student viewed is recorded.
 */
export function SignInLogSection({ userId, title }: { userId: string; title?: (count: number) => ReactNode }) {
  const [params, setParams] = useSearchParams()
  const range = rangeFrom(params)
  const page = Math.max(1, Number(params.get('log_page')) || 1)
  const { data, loading, error, reload } = useResource<SignInLog>(
    async () => unwrap(await devicesService.signInLog(userId, { from: range.from, to: range.to, page, limit: PAGE_SIZE }), 'The sign-in log could not be loaded'),
    [userId, range.from, range.to, page],
  )
  const [exporting, setExporting] = useState(false)

  const patch = (next: Record<string, string | null>) => setParams((prev) => {
    const p = new URLSearchParams(prev)
    for (const [k, v] of Object.entries(next)) { if (v) p.set(k, v); else p.delete(k) }
    return p
  }, { replace: true })
  const setRange = (r: DateRange) => patch({
    log_range: r.preset === 'custom' || r.preset === 'all' ? null : r.preset,
    log_from: r.preset === 'custom' ? r.from : null,
    log_to: r.preset === 'custom' ? r.to : null,
    log_page: null,
  })

  const exportCsv = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const { filename } = await devicesService.exportSignInLog(userId, { from: range.from, to: range.to })
      toast.success(`Sign-in log exported as ${filename}`)
    } catch (err) {
      toast.error(errText(err, 'The sign-in log could not be exported'))
    } finally {
      setExporting(false)
    }
  }

  const s = data?.summary
  const entries = data?.entries ?? []
  const total = data?.pagination.total ?? 0
  const pages = data?.pagination.totalPages ?? 1
  const filtered = range.preset !== 'all'

  return (
    <Section
      flush
      title={title ? title(total) : 'Sign-in log'}
      description="When the student signed in and on which device, when they were last active, and when and why they were signed out. Times in IST. Only sign-ins are recorded, not what the student viewed."
      action={(
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} align="end" className="min-w-0" />
          <Button variant="outline" size="sm" className="h-9 bg-card" onClick={exportCsv} disabled={exporting || (!!data && total === 0)}>
            {exporting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      )}
    >
      {error && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-warning-soft px-5 py-2.5 text-sm text-warning">
          <span>The sign-in log could not be loaded{data ? '; showing the last loaded page' : ''}. {error}</span>
          <Button size="sm" variant="outline" className="bg-card" onClick={() => reload()}>Try again</Button>
        </div>
      )}
      {s && total > 0 && (
        <p aria-live="polite" className="border-t border-border px-5 py-2.5 text-[13px] text-muted-foreground">
          {plural(s.sign_ins, 'sign-in')} on {plural(s.devices, 'device')}
          {s.refused > 0 && <>, {plural(s.refused, 'refused sign-in')}</>}
          {s.signed_in_now > 0 && <>; signed in now on {plural(s.signed_in_now, 'device')}</>}
          {s.last_active_at && <>. Last active {dayTimeIST(s.last_active_at)}</>}
          {filtered && <> ({rangeLabel(range)})</>}.
        </p>
      )}
      {loading && !data ? (
        <div role="status" aria-label="Loading the sign-in log" className="space-y-2 border-t border-border px-5 py-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 rounded-md" />)}
        </div>
      ) : !data && error ? null : entries.length === 0 ? (
        <div className="border-t border-border px-5 py-9 text-center text-sm text-muted-foreground">
          <History aria-hidden="true" className="mx-auto mb-2 h-7 w-7 opacity-40" />
          {/* Not lowercased: "in yesterday" / "in 28 nov 2026" read wrongly */}
          {filtered ? `No sign-ins in this period (${rangeLabel(range)})` : 'No sign-ins recorded yet'}
          {filtered && <div className="mt-2"><Button size="sm" variant="outline" className="bg-card" onClick={() => setRange(presetRange('all'))}>Show everything</Button></div>}
        </div>
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity duration-150' : 'transition-opacity duration-150'}>
          <div className="overflow-x-auto border-t border-border">
            <Table className="min-w-[880px]">
              <caption className="sr-only">Sign-in log, newest first. Times in IST.</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {['Device', 'Signed in', 'Last active', 'Signed out', 'How it ended'].map((h, i, all) => (
                    <TableHead key={h} scope="col" className={i === 0 ? 'pl-5' : i === all.length - 1 ? 'pr-5' : ''}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e, i) => <LogRow key={`${e.session_id}-${e.signed_in_at ?? e.refused_at ?? e.signed_out_at ?? i}-${i}`} entry={e} />)}
              </TableBody>
            </Table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-2.5 text-sm text-muted-foreground">
              <span>Page {data?.pagination.page ?? page} of {pages}, {plural(total, 'entry', 'entries')}</span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-8 w-8 bg-card" aria-label="Previous page" disabled={page <= 1} onClick={() => patch({ log_page: page - 1 > 1 ? String(page - 1) : null })}><ChevronLeft aria-hidden="true" /></Button>
                <Button size="icon" variant="outline" className="h-8 w-8 bg-card" aria-label="Next page" disabled={page >= pages} onClick={() => patch({ log_page: String(page + 1) })}><ChevronRight aria-hidden="true" /></Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  )
}

const When = ({ at, empty = 'Not recorded' }: { at: string | null; empty?: string }) => (
  at
    ? <span className="whitespace-nowrap text-xs" title={relativeTime(at)}>{dayTimeIST(at)}</span>
    : <span className="whitespace-nowrap text-xs text-muted-foreground">{empty}</span>
)

function LogRow({ entry: e }: { entry: SignInLogEntry }) {
  const Icon = ICON[e.device_type ?? ''] ?? Monitor
  const device = (
    <div className="max-w-[280px]">
      <p className="break-words text-sm font-medium">{e.device_name || 'Unknown device'}</p>
      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {PLATFORM[e.device_type ?? ''] ?? 'Unknown platform'} · {e.client === 'web_store' ? 'Web store' : 'App'}
        {e.new_device && <> · new device</>}
      </p>
    </div>
  )
  const cells: ReactNode[] = e.kind === 'refused'
    ? [
      device,
      <span key="i" className="text-xs text-muted-foreground">Not signed in</span>,
      <span key="l" className="text-xs text-muted-foreground">None</span>,
      <When key="o" at={e.refused_at} />,
      <div key="h" className="max-w-[300px] space-y-0.5"><StatusPill tone="warning">Refused</StatusPill><p className="text-xs text-muted-foreground">{e.refused_reason_label || 'Sign-in refused'}</p></div>,
    ]
    : [
      device,
      <When key="i" at={e.signed_in_at} />,
      <When key="l" at={e.last_active_at} />,
      e.is_current ? <span key="o" className="text-xs text-muted-foreground">Still signed in</span> : <When key="o" at={e.signed_out_at} />,
      e.is_current
        ? <StatusPill key="h" tone="success">Signed in now</StatusPill>
        : (
          <div key="h" className="max-w-[300px] space-y-0.5">
            <p className="text-xs">{e.end_reason_label || 'Signed out'}</p>
            {e.ended_by_admin_name && <p className="text-xs text-muted-foreground">By {e.ended_by_admin_name}</p>}
            {e.note && <p className="break-words text-xs text-muted-foreground" title={e.note}>Note: {e.note}</p>}
          </div>
        ),
    ]
  return (
    <TableRow className="hover:bg-transparent">
      {cells.map((c, i, all) => <TableCell key={i} className={i === 0 ? 'py-2.5 pl-5 align-top' : i === all.length - 1 ? 'py-2.5 pr-5 align-top' : 'py-2.5 align-top'}>{c}</TableCell>)}
    </TableRow>
  )
}
