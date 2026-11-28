import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { formatCount, formatDayTime } from '@/lib/format'
import type { EbookIssue, EbookReport } from '@/services/books.service'
import { plural } from './bookDisplay'

function Issues({ title, issues, tone }: { title: string; issues: EbookIssue[]; tone: 'danger' | 'warning' }) {
  if (!issues.length) return null
  const Icon = tone === 'danger' ? XCircle : AlertTriangle
  return (
    <div className={tone === 'danger' ? 'rounded-lg bg-danger-soft px-4 py-3' : 'rounded-lg bg-warning-soft px-4 py-3'}>
      <p className={tone === 'danger' ? 'text-sm font-semibold text-danger' : 'text-sm font-semibold text-warning'}>{title}</p>
      <ul className="mt-1.5 space-y-1.5">
        {issues.map((issue, i) => (
          <li key={`${issue.code}-${i}`} className="flex gap-2 text-sm">
            <Icon aria-hidden="true" className={tone === 'danger' ? 'mt-0.5 h-4 w-4 shrink-0 text-danger' : 'mt-0.5 h-4 w-4 shrink-0 text-warning'} />
            <span className="min-w-0 break-words">{issue.message}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const row = (label: string, value: string | null | undefined) => (value ? { label, value } : null)

/** What the checks found, in words the admin can act on. */
export function ValidationReport({ report, summary = true }: { report: EbookReport; summary?: boolean }) {
  const { info } = report
  const facts = [
    row('Title in the file', info.title),
    row('Author in the file', info.author),
    row('Language', info.language),
    row('Chapters', info.sections != null ? formatCount(info.sections) : null),
    row('Length', info.estimated_pages ? `About ${plural(info.estimated_pages, 'page')}` : null),
    row('Pictures', info.images != null ? formatCount(info.images) : null),
    row('Contents list', info.toc_entries ? plural(info.toc_entries, 'entry', 'entries') : info.sections != null ? 'None' : null),
    row('Cover in the file', info.sections != null ? (info.has_cover ? 'Yes' : 'No') : null),
    row('Layout', info.fixed_layout ? 'Fixed pages' : info.sections != null ? 'Flowing text' : null),
  ].filter((x): x is { label: string; value: string } => !!x)

  return (
    <div className="space-y-4">
      {summary && <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium">
        {report.status === 'failed'
          ? <><XCircle aria-hidden="true" className="h-4 w-4 text-danger" />This file was not accepted</>
          : report.status === 'warnings'
            ? <><AlertTriangle aria-hidden="true" className="h-4 w-4 text-warning" />Accepted, with {plural(report.warnings.length, 'thing')} to know</>
            : <><CheckCircle2 aria-hidden="true" className="h-4 w-4 text-success" />All checks passed</>}
        <span className="font-normal text-muted-foreground">{formatDayTime(report.checked_at)}</span>
      </p>}
      <Issues title={plural(report.errors_found.length, 'problem to fix', 'problems to fix')} issues={report.errors_found} tone="danger" />
      <Issues title={report.status === 'failed' ? 'Also worth fixing' : 'Students will notice'} issues={report.warnings} tone="warning" />
      {facts.length > 0 && (
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
              <dd className="break-words text-sm font-medium">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
