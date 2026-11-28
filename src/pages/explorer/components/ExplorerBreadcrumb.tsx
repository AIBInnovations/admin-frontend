import { Fragment } from 'react'
import { ChevronRight, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EXPLORER_BASE, type ExplorerFocus } from '../parseExplorerPath'
import { FolderLink } from './FolderLink'

interface Names {
  subjectName?: string
  packageName?: string
  seriesName?: string
  moduleName?: string
  videoName?: string
  bookName?: string
}

function buildCrumbs(focus: ExplorerFocus, names: Names): { label: string; href: string }[] {
  if (focus.level === 'root' || focus.level === 'invalid') return []
  if (focus.level === 'books' || focus.level === 'book') {
    const crumbs = [{ label: 'Books', href: `${EXPLORER_BASE}/books` }]
    if (focus.level === 'book') crumbs.push({ label: names.bookName ?? 'Book', href: `${EXPLORER_BASE}/books/${focus.bookId}` })
    return crumbs
  }
  let href = `${EXPLORER_BASE}/subjects/${focus.subjectId}`
  const crumbs = [{ label: names.subjectName ?? 'Subject', href }]
  if ('packageId' in focus) crumbs.push({ label: names.packageName ?? 'Package', href: (href += `/packages/${focus.packageId}`) })
  if ('seriesId' in focus) crumbs.push({ label: names.seriesName ?? 'Series', href: (href += `/series/${focus.seriesId}`) })
  if ('moduleId' in focus) crumbs.push({ label: names.moduleName ?? 'Module', href: (href += `/modules/${focus.moduleId}`) })
  if ('videoId' in focus) crumbs.push({ label: names.videoName ?? 'Video', href: (href += `/videos/${focus.videoId}`) })
  return crumbs
}

export function ExplorerBreadcrumb({ focus, ...names }: { focus: ExplorerFocus } & Names) {
  const crumbs = buildCrumbs(focus, names)
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      {/* The page's heading for screen readers; sighted admins read the last crumb */}
      <h1 className="sr-only">{crumbs.length ? crumbs[crumbs.length - 1].label : 'Explorer'}</h1>
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        <li className="shrink-0">
          <FolderLink
            href={EXPLORER_BASE}
            aria-label="Explorer"
            aria-current={crumbs.length === 0 ? 'page' : undefined}
            className={cn('flex items-center justify-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:text-foreground pointer-coarse:-my-2 pointer-coarse:min-h-10 pointer-coarse:min-w-10', crumbs.length === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground')}
          >
            <Compass aria-hidden="true" className="h-4 w-4" />
            <span className={crumbs.length > 0 ? 'hidden @lg:inline' : ''}>Explorer</span>
          </FolderLink>
        </li>
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1
          // On a narrow bar only the last two levels stay
          const hide = i < crumbs.length - 2
          return (
            <Fragment key={crumb.href}>
              <li aria-hidden="true" className={cn('shrink-0 text-muted-foreground/60', hide && 'hidden @3xl:block')}><ChevronRight className="h-3.5 w-3.5" /></li>
              <li className={cn('min-w-0', last ? 'shrink' : 'shrink-[8] pointer-coarse:min-w-10', hide && 'hidden @3xl:block')}>
                {last ? (
                  <span aria-current="page" title={crumb.label} className="block truncate px-1 font-semibold text-foreground">{crumb.label}</span>
                ) : (
                  <FolderLink href={crumb.href} title={crumb.label} className="block max-w-40 truncate rounded px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground pointer-coarse:-my-2.5 pointer-coarse:min-w-10 pointer-coarse:py-3">{crumb.label}</FolderLink>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
