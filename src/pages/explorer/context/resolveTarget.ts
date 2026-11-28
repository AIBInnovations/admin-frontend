import type { ExplorerFocus } from '../parseExplorerPath'
import type { ExplorerData } from '../hooks/useExplorerData'
import type { CreateKind, PanelContext, PanelEntityKind, PanelTarget } from '../panel/panelTypes'

const KINDS: PanelEntityKind[] = ['subject', 'package', 'series', 'module', 'video', 'document', 'book']
const CREATE: CreateKind[] = ['subject', 'package', 'series', 'module', 'upcoming', 'book']

export function parseItem(value: string | null): { kind: PanelEntityKind; id: string } | null {
  if (!value) return null
  const [kind, id] = value.split(':')
  return id && KINDS.includes(kind as PanelEntityKind) ? { kind: kind as PanelEntityKind, id } : null
}

function contextOf(focus: ExplorerFocus): PanelContext {
  return {
    subjectId: 'subjectId' in focus ? focus.subjectId : undefined,
    packageId: 'packageId' in focus ? focus.packageId : undefined,
    seriesId: 'seriesId' in focus ? focus.seriesId : undefined,
    moduleId: 'moduleId' in focus ? focus.moduleId : undefined,
  }
}

function find(kind: PanelEntityKind, id: string, data: ExplorerData): unknown {
  const series = data.packageDetail?.series ?? []
  const match = <T extends { _id: string }>(list: T[] | undefined) => list?.find((x) => x._id === id)
  switch (kind) {
    case 'subject': return data.subject?._id === id ? data.subject : match(data.subjects)
    case 'package': return data.packageDetail?._id === id ? data.packageDetail : match(data.packages)
    case 'series': return match(series)
    case 'module': return match(series.flatMap((s) => s.modules ?? []))
    case 'video': return match(series.flatMap((s) => s.modules ?? []).flatMap((m) => m.videos ?? []))
    case 'document': return match(series.flatMap((s) => s.documents ?? [])) ?? match(data.subjectDocuments) ?? match(data.libraryDocuments)
    case 'book': return match(data.books) ?? (data.book?._id === id ? data.book : undefined)
  }
}

/** The folder you are in is what the editor shows until you pick something. */
function focusTarget(focus: ExplorerFocus, data: ExplorerData): PanelTarget | null {
  const ctx = contextOf(focus)
  const as = (kind: PanelEntityKind, entity: { _id: string } | undefined): PanelTarget | null =>
    entity ? { kind, id: entity._id, entity, ctx } : null
  switch (focus.level) {
    case 'subject': return as('subject', data.subject)
    case 'package': return as('package', data.packageDetail)
    case 'series': return as('series', data.currentSeries)
    case 'module': return as('module', data.currentModule)
    case 'video': return as('video', data.currentVideo)
    case 'book': return as('book', data.book)
    default: return null
  }
}

export interface Resolved {
  target: PanelTarget | null
  /** Picked by the admin (in the URL), not just the folder's own details. */
  manual: boolean
  /** Still loading what the URL asks for. */
  waiting: boolean
  /** The URL names something that is not here any more. */
  lost: boolean
}

export function resolveTarget(focus: ExplorerFocus, data: ExplorerData, params: URLSearchParams): Resolved {
  const create = params.get('new') as CreateKind | null
  if (create && CREATE.includes(create)) {
    return { target: { kind: create, id: null, entity: null, ctx: contextOf(focus) }, manual: true, waiting: false, lost: false }
  }
  const item = parseItem(params.get('item'))
  if (item) {
    const entity = find(item.kind, item.id, data)
    if (entity) return { target: { kind: item.kind, id: item.id, entity, ctx: contextOf(focus) }, manual: true, waiting: false, lost: false }
    return { target: null, manual: true, waiting: data.loading, lost: !data.loading && !data.error && !data.missing }
  }
  const target = focusTarget(focus, data)
  // A book's own address is a book picked from the list
  return { target, manual: focus.level === 'book' && !!target, waiting: !target && data.loading, lost: false }
}
