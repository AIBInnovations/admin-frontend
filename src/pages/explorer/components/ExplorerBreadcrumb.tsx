import { Link } from 'react-router-dom'
import { ChevronRight, Compass } from 'lucide-react'
import { EXPLORER_BASE, type ExplorerFocus } from '../parseExplorerPath'

interface Crumb {
  label: string
  href: string
}

function buildCrumbs(focus: ExplorerFocus, names: {
  subjectName?: string
  packageName?: string
  seriesName?: string
  moduleName?: string
}): Crumb[] {
  if (focus.level === 'root' || focus.level === 'invalid') return []

  const crumbs: Crumb[] = []

  crumbs.push({
    label: names.subjectName ?? focus.subjectId,
    href: `${EXPLORER_BASE}/subjects/${focus.subjectId}`,
  })

  if (focus.level === 'subject') return crumbs

  crumbs.push({
    label: names.packageName ?? focus.packageId,
    href: `${EXPLORER_BASE}/subjects/${focus.subjectId}/packages/${focus.packageId}`,
  })

  if (focus.level === 'package') return crumbs

  crumbs.push({
    label: names.seriesName ?? focus.seriesId,
    href: `${EXPLORER_BASE}/subjects/${focus.subjectId}/packages/${focus.packageId}/series/${focus.seriesId}`,
  })

  if (focus.level === 'series') return crumbs

  crumbs.push({
    label: names.moduleName ?? focus.moduleId,
    href: `${EXPLORER_BASE}/subjects/${focus.subjectId}/packages/${focus.packageId}/series/${focus.seriesId}/modules/${focus.moduleId}`,
  })

  return crumbs
}

interface ExplorerBreadcrumbProps {
  focus: ExplorerFocus
  subjectName?: string
  packageName?: string
  seriesName?: string
  moduleName?: string
}

export function ExplorerBreadcrumb({
  focus,
  subjectName,
  packageName,
  seriesName,
  moduleName,
}: ExplorerBreadcrumbProps) {
  const crumbs = buildCrumbs(focus, { subjectName, packageName, seriesName, moduleName })

  return (
    <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
      <Link
        to={EXPLORER_BASE}
        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
      >
        <Compass className="w-3.5 h-3.5" />
        <span className={crumbs.length === 0 ? 'text-white font-medium' : ''}>
          Explorer
        </span>
      </Link>

      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1
        return (
          <span key={crumb.href} className="flex items-center gap-1 min-w-0">
            <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
            {isLast ? (
              <span className="inline-block font-medium text-white truncate max-w-32 sm:max-w-48 align-bottom">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.href}
                className="inline-block text-slate-400 hover:text-slate-200 transition-colors truncate max-w-24 sm:max-w-36 align-bottom"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
