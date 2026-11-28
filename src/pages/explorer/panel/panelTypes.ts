/**
 * What the docked editor shows. It is named in the URL (?item=package:ID or
 * ?new=package), so a reload, a shared link and the browser's Back all work.
 */
export type PanelEntityKind =
  | 'subject'
  | 'package'
  | 'series'
  | 'module'
  | 'video'
  | 'document'
  | 'book'

/** Things that can be created; an upcoming video is a placeholder without a file. */
export type CreateKind = Exclude<PanelEntityKind, 'video' | 'document'> | 'upcoming'

/** Parent ids a create needs. */
export interface PanelContext {
  subjectId?: string
  packageId?: string
  seriesId?: string
  moduleId?: string
}

export type PanelTarget =
  | { kind: PanelEntityKind; id: string; entity: unknown; ctx?: PanelContext }
  | { kind: CreateKind; id: null; entity: null; ctx?: PanelContext }

export function targetKey(target: PanelTarget | null): string | null {
  if (!target) return null
  return target.id === null ? `new:${target.kind}` : `${target.kind}:${target.id}`
}
