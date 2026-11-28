import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ReportColumn<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  align?: 'right'
  /** Makes the header a sort button. */
  sort?: (row: T) => number | string
  footer?: ReactNode
  className?: string
  /**
   * The first cell holds its own link (a student's name), so it is not wrapped
   * in the row's link; put the row's link in another cell for keyboard users.
   */
  ownLink?: boolean
}

interface ReportTableProps<T> {
  caption: string
  columns: ReportColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** The whole row opens this. The first cell is the real link. */
  rowHref?: (row: T) => string | null
  /** Rows shown under a row (a package's plans). */
  subRows?: (row: T) => T[]
  empty?: ReactNode
  initialSort?: { key: string; desc: boolean }
  refreshing?: boolean
  /** Scrolls inside this height; the header and the totals stay in view. */
  maxHeight?: number
}

/** Numbers in rows: sortable, a totals row, and every row opens what it counts. */
export function ReportTable<T>({ caption, columns, rows, rowKey, rowHref, subRows, empty, initialSort, refreshing, maxHeight }: ReportTableProps<T>) {
  const navigate = useNavigate()
  const [sort, setSort] = useState(initialSort ?? null)
  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key)
    if (!col?.sort) return rows
    const dir = sort!.desc ? -1 : 1
    return [...rows].sort((a, b) => {
      const x = col.sort!(a); const y = col.sort!(b)
      return (typeof x === 'string' ? x.localeCompare(String(y)) : x - (y as number)) * dir
    })
  }, [rows, columns, sort])
  const hasFooter = columns.some((c) => c.footer !== undefined)

  const renderRow = (row: T, sub: boolean) => {
    const href = rowHref?.(row) ?? null
    return (
      <tr
        key={rowKey(row)}
        onClick={href ? (e) => {
          if ((e.target as HTMLElement).closest('a, button, [data-no-row-click]')) return
          if (window.getSelection()?.toString()) return
          if (e.metaKey || e.ctrlKey) window.open(href, '_blank', 'noopener')
          else navigate(href)
        } : undefined}
        className={cn('group border-b border-border last:border-0', href && 'cursor-pointer transition-colors hover:bg-accent/50', sub && 'bg-muted/35')}
      >
        {columns.map((c, i) => {
          const body = c.cell(row)
          if (i === 0) {
            return (
              <th key={c.key} scope="row" className={cn('sticky left-0 z-[1] min-w-[150px] max-w-[46vw] bg-card px-4 py-2.5 text-left align-middle font-normal sm:max-w-[320px]', href && 'group-hover:bg-[hsl(var(--accent))]', sub && 'bg-[color-mix(in_srgb,hsl(var(--muted))_35%,hsl(var(--card)))] pl-8', c.className)}>
                {href && !c.ownLink ? <Link to={href} className="block rounded-sm hover:text-primary">{body}</Link> : body}
              </th>
            )
          }
          return <td key={c.key} className={cn('whitespace-nowrap px-4 py-2.5 align-middle', c.align === 'right' && 'text-right tabular-nums', c.className)}>{body}</td>
        })}
      </tr>
    )
  }

  if (!rows.length && empty) return <div className="px-5 pb-6 pt-2 text-center text-sm text-muted-foreground">{empty}</div>
  return (
    <div className={cn('report-table pg-scroll-x relative transition-opacity duration-150', maxHeight ? 'overflow-auto' : 'overflow-x-auto', refreshing && 'opacity-60')} style={maxHeight ? { maxHeight } : undefined} aria-busy={refreshing || undefined} role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className={cn(maxHeight && 'sticky top-0 z-[3] shadow-[inset_0_-1px_0_hsl(var(--border))]')}>
          <tr className={cn('border-y border-border', maxHeight ? 'bg-[color-mix(in_srgb,hsl(var(--muted))_40%,hsl(var(--card)))]' : 'bg-muted/40')}>
            {columns.map((c, i) => {
              const on = sort?.key === c.key
              const Icon = on ? (sort!.desc ? ArrowDown : ArrowUp) : ArrowUpDown
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={c.sort ? (on ? (sort!.desc ? 'descending' : 'ascending') : 'none') : undefined}
                  className={cn('h-10 whitespace-nowrap px-4 text-[13px] font-medium text-muted-foreground', c.align === 'right' ? 'text-right' : 'text-left', i === 0 && 'sticky left-0 z-[2] bg-[color-mix(in_srgb,hsl(var(--muted))_40%,hsl(var(--card)))]')}
                >
                  {c.sort ? (
                    <button type="button" onClick={() => setSort(on ? { key: c.key, desc: !sort!.desc } : { key: c.key, desc: c.align === 'right' })} className={cn('-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground', on && 'text-foreground')}>
                      {c.header}<Icon aria-hidden="true" className={cn('h-3 w-3', !on && 'opacity-40')} />
                    </button>
                  ) : c.header}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <Fragment key={rowKey(row)}>
              {renderRow(row, false)}
              {subRows?.(row).map((s) => renderRow(s, true))}
            </Fragment>
          ))}
        </tbody>
        {hasFooter && (
          <tfoot className={cn(maxHeight && 'sticky bottom-0 z-[3] shadow-[inset_0_1px_0_hsl(var(--border))]')}>
            <tr className={cn('border-t border-border font-medium', maxHeight ? 'bg-[color-mix(in_srgb,hsl(var(--muted))_60%,hsl(var(--card)))]' : 'bg-muted/60')}>
              {columns.map((c, i) => <td key={c.key} className={cn('whitespace-nowrap px-4 py-2.5', c.align === 'right' && 'text-right tabular-nums', i === 0 && 'sticky left-0 bg-[color-mix(in_srgb,hsl(var(--muted))_60%,hsl(var(--card)))]')}>{c.footer}</td>)}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
