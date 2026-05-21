import { publishService, type EntityType } from '@/services/publish.service'
import type { ApiResponse } from '@/services/api.service'
import type { DeleteImpactResponse } from '@/types/api.types'

/** Normalised per-item impact for a bulk action. `blocked` items are skipped. */
export interface BulkClassification {
  blocked: boolean
  reasons: string[]
}

/** Publish readiness — failed videos hard-block; drafts/ancestors are warnings. */
export async function classifyPublish(entityType: EntityType, id: string): Promise<BulkClassification> {
  try {
    const info = (await publishService.getPublishInfo(entityType, id)) as Record<string, any> | null
    if (!info) return { blocked: false, reasons: [] }
    const reasons: string[] = []
    const failed = info.failed_videos ?? 0
    const blocked = failed > 0
    if (blocked) reasons.push(`${failed} failed video${failed > 1 ? 's' : ''} — fix first`)
    const cs = info.children_summary ?? {}
    const draft = (cs.draft_series ?? 0) + (cs.draft_modules ?? 0) + (cs.draft_videos ?? 0) + (cs.draft_documents ?? 0)
    if (draft > 0) reasons.push(`${draft} draft child item${draft > 1 ? 's' : ''} (publish cascades)`)
    const anc = info.unpublished_ancestors?.length ?? 0
    if (anc > 0) reasons.push(`${anc} unpublished parent${anc > 1 ? 's' : ''}`)
    return { blocked, reasons }
  } catch {
    return { blocked: false, reasons: [] }
  }
}

/** Unpublish — never hard-blocks; purchases/enrollments/published-children are warnings. */
export async function classifyUnpublish(entityType: EntityType, id: string): Promise<BulkClassification> {
  try {
    const info = (await publishService.getPublishInfo(entityType, id)) as Record<string, any> | null
    if (!info) return { blocked: false, reasons: [] }
    const reasons: string[] = []
    const purch = info.active_purchases ?? 0
    if (purch > 0) reasons.push(`${purch} active purchase${purch > 1 ? 's' : ''} — access revoked`)
    const enr = info.active_enrollments ?? 0
    if (enr > 0) reasons.push(`${enr} active enrollment${enr > 1 ? 's' : ''}`)
    const cs = info.children_summary ?? {}
    const pub = (cs.published_series ?? 0) + (cs.published_modules ?? 0) + (cs.published_videos ?? 0) + (cs.published_documents ?? 0)
    if (pub > 0) reasons.push(`${pub} published child item${pub > 1 ? 's' : ''}`)
    return { blocked: false, reasons }
  } catch {
    return { blocked: false, reasons: [] }
  }
}

/** Archive — blocking deps hard-block; non-blocking deps are warnings. */
export async function classifyArchive(
  fetchImpact: (id: string) => Promise<ApiResponse<DeleteImpactResponse>>,
  id: string,
): Promise<BulkClassification> {
  try {
    const res = await fetchImpact(id)
    if (res.success && res.data) {
      const blocking = res.data.dependencies.filter((d) => d.blocking)
      const warns = res.data.dependencies.filter((d) => !d.blocking)
      const reasons = [
        ...blocking.map((d) => `${d.count} ${d.label} (blocking)`),
        ...warns.map((d) => `${d.count} ${d.label}`),
      ]
      return { blocked: res.data.blocked, reasons }
    }
    return { blocked: false, reasons: [] }
  } catch {
    return { blocked: false, reasons: [] }
  }
}
