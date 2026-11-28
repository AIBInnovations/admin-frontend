import type { ReactNode } from 'react'
import { BookCopy, Compass } from 'lucide-react'
import { formatCount } from '@/lib/format'
import { usePanelSelection } from '../context/PanelSelectionContext'
import { useExplorerAccess } from '../access'
import type { ExplorerData } from '../hooks/useExplorerData'
import type { ExplorerFocus } from '../parseExplorerPath'
import { plural } from '../ui/text'
import { PanelSkeleton } from './ExplorerSkeleton'

interface Fact { label: string; value: ReactNode; warn?: boolean }

function Facts({ facts }: { facts: Fact[] }) {
  return (
    <dl className="divide-y divide-border rounded-lg border border-border">
      {facts.map((f) => (
        <div key={f.label} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
          <dt className="text-sm text-muted-foreground">{f.label}</dt>
          <dd className={`text-sm font-semibold tabular-nums ${f.warn ? 'text-warning' : 'text-foreground'}`}>{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function PickList({ title, rows, kind }: { title: string; rows: { _id: string; name: string; note: string }[]; kind: 'subject' | 'book' }) {
  const { select } = usePanelSelection()
  if (rows.length === 0) return null
  return (
    <section aria-label={title} className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {rows.slice(0, 8).map((r) => (
          <li key={r._id}>
            <button type="button" onClick={() => select(kind, r._id)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/70">
              <span className="min-w-0 truncate text-sm font-medium text-foreground">{r.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{r.note}</span>
            </button>
          </li>
        ))}
      </ul>
      {rows.length > 8 && <p className="text-xs text-muted-foreground">and {rows.length - 8} more in the list</p>}
    </section>
  )
}

/** What the editor shows before anything is picked: the folder at a glance. */
export function ExplorerSummary({ focus, data }: { focus: ExplorerFocus; data: ExplorerData }) {
  const { can } = useExplorerAccess()
  const isBooks = focus.level === 'books' || focus.level === 'book'
  const Icon = isBooks ? BookCopy : Compass

  let body: ReactNode = null
  if (isBooks) {
    const books = data.books
    if (!books) body = data.loading ? <PanelSkeleton /> : null
    else {
      const low = books.filter((b) => b.stock_quantity <= 5)
      const drafts = books.filter((b) => b.publish_status === 'draft')
      body = (
        <>
          <Facts facts={[
            { label: 'Books', value: formatCount(books.length) },
            { label: 'Published', value: formatCount(books.length - drafts.length) },
            { label: 'With an eBook', value: formatCount(books.filter((b) => b.ebook).length) },
            { label: 'Unavailable', value: formatCount(books.filter((b) => !b.is_available).length) },
            { label: '5 or fewer in stock', value: formatCount(low.length), warn: low.length > 0 },
          ]} />
          <PickList title="Low stock" kind="book" rows={low.map((b) => ({ _id: b._id, name: b.title, note: `${b.stock_quantity} left` }))} />
          <PickList title="Drafts" kind="book" rows={drafts.map((b) => ({ _id: b._id, name: b.title, note: 'Draft' }))} />
        </>
      )
    }
  } else {
    const subjects = data.subjects
    if (!subjects) body = data.loading ? <PanelSkeleton /> : null
    else {
      const inactive = subjects.filter((s) => !s.is_active)
      const empty = subjects.filter((s) => (s.package_count ?? 0) === 0)
      body = (
        <>
          <Facts facts={[
            { label: 'Subjects', value: formatCount(subjects.length) },
            { label: 'Packages', value: formatCount(subjects.reduce((n, s) => n + (s.package_count ?? 0), 0)) },
            { label: 'Inactive subjects', value: formatCount(inactive.length), warn: inactive.length > 0 },
            ...(can('document', 'read') ? [{ label: 'Documents outside any subject', value: formatCount(data.libraryDocuments?.length ?? 0) }] : []),
          ]} />
          <PickList title="Inactive" kind="subject" rows={inactive.map((s) => ({ _id: s._id, name: s.name, note: 'Hidden from students' }))} />
          <PickList title="No packages yet" kind="subject" rows={empty.map((s) => ({ _id: s._id, name: s.name, note: plural(0, 'package') }))} />
        </>
      )
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-snug text-foreground">{isBooks ? 'Books at a glance' : 'Explorer at a glance'}</h2>
          <p className="text-xs text-muted-foreground">Pick an item from the list to see and edit it here.</p>
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">{body}</div>
    </div>
  )
}
