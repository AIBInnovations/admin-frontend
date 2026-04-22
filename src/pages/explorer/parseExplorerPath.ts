export const EXPLORER_BASE = '/content/explorer'

export type ExplorerLevel = 'root' | 'subject' | 'package' | 'series' | 'module' | 'invalid'

export type ExplorerFocus =
  | { level: 'root' }
  | { level: 'subject'; subjectId: string }
  | { level: 'package'; subjectId: string; packageId: string }
  | { level: 'series'; subjectId: string; packageId: string; seriesId: string }
  | { level: 'module'; subjectId: string; packageId: string; seriesId: string; moduleId: string }
  | { level: 'invalid'; reason: 'malformed' | 'notfound' | 'chain_mismatch'; fallbackUrl: string }

export function parseExplorerPath(pathname: string): ExplorerFocus {
  const path = pathname.startsWith(EXPLORER_BASE)
    ? pathname.slice(EXPLORER_BASE.length)
    : ''
  const segs = path.split('/').filter(Boolean)

  if (segs.length === 0) return { level: 'root' }

  if (segs[0] !== 'subjects' || !segs[1])
    return { level: 'invalid', reason: 'malformed', fallbackUrl: EXPLORER_BASE }

  const subjectId = segs[1]
  if (segs.length === 2) return { level: 'subject', subjectId }

  if (segs[2] !== 'packages' || !segs[3])
    return { level: 'invalid', reason: 'malformed', fallbackUrl: `${EXPLORER_BASE}/subjects/${subjectId}` }

  const packageId = segs[3]
  if (segs.length === 4) return { level: 'package', subjectId, packageId }

  if (segs[4] !== 'series' || !segs[5])
    return { level: 'invalid', reason: 'malformed', fallbackUrl: `${EXPLORER_BASE}/subjects/${subjectId}/packages/${packageId}` }

  const seriesId = segs[5]
  if (segs.length === 6) return { level: 'series', subjectId, packageId, seriesId }

  if (segs[6] !== 'modules' || !segs[7])
    return { level: 'invalid', reason: 'malformed', fallbackUrl: `${EXPLORER_BASE}/subjects/${subjectId}/packages/${packageId}/series/${seriesId}` }

  const moduleId = segs[7]
  return { level: 'module', subjectId, packageId, seriesId, moduleId }
}

export function getParentUrl(focus: ExplorerFocus): string | null {
  switch (focus.level) {
    case 'root': return null
    case 'subject': return EXPLORER_BASE
    case 'package': return `${EXPLORER_BASE}/subjects/${focus.subjectId}`
    case 'series': return `${EXPLORER_BASE}/subjects/${focus.subjectId}/packages/${focus.packageId}`
    case 'module': return `${EXPLORER_BASE}/subjects/${focus.subjectId}/packages/${focus.packageId}/series/${focus.seriesId}`
    default: return EXPLORER_BASE
  }
}

export function buildChildUrl(focus: ExplorerFocus, childId: string): string {
  switch (focus.level) {
    case 'root': return `${EXPLORER_BASE}/subjects/${childId}`
    case 'subject': return `${EXPLORER_BASE}/subjects/${focus.subjectId}/packages/${childId}`
    case 'package': return `${EXPLORER_BASE}/subjects/${focus.subjectId}/packages/${focus.packageId}/series/${childId}`
    case 'series': return `${EXPLORER_BASE}/subjects/${focus.subjectId}/packages/${focus.packageId}/series/${focus.seriesId}/modules/${childId}`
    default: return EXPLORER_BASE
  }
}

export function getRefName(ref: { _id: string; name: string } | string | null | undefined): string | null {
  if (!ref) return null
  if (typeof ref === 'string') return null
  return ref.name
}
