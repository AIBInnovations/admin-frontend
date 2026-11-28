import { publishService, type EntityType, type PublishInfo } from '@/services/publish.service'
import type { ApiResponse } from '@/services/api.service'
import type { DeleteImpactResponse } from '@/types/api.types'
import { plural } from '../ui/text'

/** What a bulk action would do to one item. Blocked items are left out. */
export interface BulkClassification {
  blocked: boolean
  reasons: string[]
}

const sum = (cs: Partial<PublishInfo['children_summary']> | undefined, prefix: 'draft' | 'published') =>
  (cs?.[`${prefix}_series`] ?? 0) + (cs?.[`${prefix}_modules`] ?? 0) + (cs?.[`${prefix}_videos`] ?? 0) + (cs?.[`${prefix}_documents`] ?? 0)

/** Failed videos block publishing; drafts inside and unpublished parents are warnings. */
export async function classifyPublish(entityType: EntityType, id: string): Promise<BulkClassification> {
  const info = (await publishService.getPublishInfo(entityType, id)) as PublishInfo | null
  const reasons: string[] = []
  const failed = info?.failed_videos ?? 0
  if (failed > 0) reasons.push(`${plural(failed, 'failed video')} to fix first`)
  const drafts = sum(info?.children_summary, 'draft')
  if (drafts > 0) reasons.push(`${plural(drafts, 'draft item')} inside stay hidden`)
  const parents = info?.unpublished_ancestors?.length ?? 0
  if (parents > 0) reasons.push(`${plural(parents, 'parent')} not published yet`)
  return { blocked: failed > 0, reasons }
}

/** Nothing blocks unpublishing; purchases, enrolments and published children are warnings. */
export async function classifyUnpublish(entityType: EntityType, id: string): Promise<BulkClassification> {
  const info = (await publishService.getPublishInfo(entityType, id)) as PublishInfo | null
  const reasons: string[] = []
  const purchases = info?.active_purchases ?? 0
  if (purchases > 0) reasons.push(`${plural(purchases, 'active purchase')} lose access`)
  const enrolments = info?.active_enrollments ?? 0
  if (enrolments > 0) reasons.push(plural(enrolments, 'active enrolment'))
  const published = sum(info?.children_summary, 'published')
  if (published > 0) reasons.push(`${plural(published, 'published item')} inside`)
  return { blocked: false, reasons }
}

export async function classifyArchive(fetchImpact: (id: string) => Promise<ApiResponse<DeleteImpactResponse>>, id: string): Promise<BulkClassification> {
  const { data } = await fetchImpact(id)
  if (!data) return { blocked: false, reasons: [] }
  return { blocked: data.blocked, reasons: data.dependencies.map((d) => `${d.count} ${d.label}${d.blocking ? ' (blocks archiving)' : ''}`) }
}
