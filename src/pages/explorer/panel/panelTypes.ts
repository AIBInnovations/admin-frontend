/**
 * Shared types for the Explorer detail panel (the docked, in-flight editor).
 *
 * The panel is driven by a "target": which entity is being edited (or created)
 * and the parent context needed to save it. Entity objects are carried by
 * reference so the panel can render immediately without a refetch; after a save
 * the panel commits its own baseline and triggers a branch refetch.
 */

export type PanelEntityKind =
  | 'subject'
  | 'package'
  | 'series'
  | 'module'
  | 'video'
  | 'document'
  | 'book'

/** Parent ids a create/save needs, plus drill context. */
export interface PanelContext {
  subjectId?: string
  packageId?: string
  seriesId?: string
  moduleId?: string
  /** For documents created/edited at subject level (no series). */
  documentSubjectId?: string
}

export interface PanelTarget {
  kind: PanelEntityKind
  /** The entity being edited. `null` => create mode. */
  entity: unknown | null
  ctx?: PanelContext
}

/** Narrow helper — true when the target is a create (blank) form. */
export function isCreate(target: PanelTarget | null): boolean {
  return !!target && target.entity === null
}

/** Pull a stable id out of any loaded entity object (for selection highlight). */
export function entityId(entity: unknown): string | null {
  if (entity && typeof entity === 'object' && '_id' in entity) {
    return String((entity as { _id: unknown })._id)
  }
  return null
}
