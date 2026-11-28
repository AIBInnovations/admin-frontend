import { apiService, type ApiResponse } from './api.service'

/**
 * Move and copy content in the package > series > module > video tree.
 * Backend: POST admin/videos/move, admin/videos/copy, admin/modules/move,
 * admin/series/move; GET admin/modules/destinations, admin/videos/:id/location.
 */

export type MoveKind = 'video-move' | 'video-copy' | 'module-move' | 'series-move'

/** A place in the tree, with names as the server knows them. */
export interface Place {
  subject_id: string | null
  subject_name: string | null
  package_id: string | null
  package_name: string | null
  series_id: string | null
  series_name: string | null
  module_id: string | null
  module_name: string | null
}

export interface DestSubject { _id: string; name: string; is_active: boolean }
export interface DestPackage { _id: string; name: string; subject_id: string | null; is_active: boolean; publish_status: 'draft' | 'published'; is_combo: boolean; series_count: number }
export interface DestSeries { _id: string; name: string; package_id: string | null; is_active: boolean; publish_status: 'draft' | 'published'; module_count: number }
export interface DestModule { _id: string; name: string; series_id: string | null; is_active: boolean; publish_status: 'draft' | 'published'; video_count: number }

export interface Destinations {
  subjects: DestSubject[]
  packages: DestPackage[]
  series: DestSeries[]
  modules: DestModule[]
}

export type SkipReason = 'already_there' | 'archived' | 'deleted' | 'not_ready' | 'replacement_processing' | 'changed_meanwhile' | 'gone'

export interface MoveResult {
  operation_id: string
  kind: 'video_move' | 'video_copy' | 'module_move' | 'series_move'
  status: 'planned' | 'done'
  target: Place
  count: number
  items: { id: string; name: string; from: Place | null; to: Place | null; display_order: number; new_id?: string }[]
  skipped: { id: string; name: string; reason: SkipReason }[]
  by: { admin_id: string | null; name: string | null }
  at: string | null
  dry_run?: boolean
  replayed?: boolean
  moved?: number
  copied?: number
  videos_with_them?: number
  modules_with_them?: number
  documents_with_them?: number
  linked_live_sessions?: number
}

interface BriefVideo { video_id: string; title: string | null; archived?: boolean; deleted?: boolean; location: Place | null }

export interface VideoLocation {
  video_id: string
  title: string
  location: Place | null
  copied_from: BriefVideo | null
  copied_at: string | null
  copies: BriefVideo[]
  shares_files_with: BriefVideo[]
  history: { operation_id: string; kind: MoveResult['kind']; at: string; by: string | null; from: Place | null; to: Place | null; role: 'moved' | 'copy' | 'source' }[]
}

export const SKIP_TEXT: Record<SkipReason, string> = {
  already_there: 'already there',
  archived: 'archived, restore it first',
  deleted: 'deleted',
  not_ready: 'still processing or failed; copy it once it is ready',
  replacement_processing: 'a replacement file is processing',
  changed_meanwhile: 'moved by someone else meanwhile',
  gone: 'deleted meanwhile',
}

const ENDPOINT: Record<MoveKind, { path: string; ids: string; target: string }> = {
  'video-move': { path: 'admin/videos/move', ids: 'video_ids', target: 'target_module_id' },
  'video-copy': { path: 'admin/videos/copy', ids: 'video_ids', target: 'target_module_id' },
  'module-move': { path: 'admin/modules/move', ids: 'module_ids', target: 'target_series_id' },
  'series-move': { path: 'admin/series/move', ids: 'series_ids', target: 'target_package_id' },
}

/** A new id for one move or copy; sent again on a retry so it is never done twice. */
export function newOperationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

class ContentMoveService {
  getDestinations(): Promise<ApiResponse<Destinations>> {
    return apiService.get<Destinations>('admin/modules/destinations')
  }

  getVideoLocation(videoId: string): Promise<ApiResponse<VideoLocation>> {
    return apiService.get<VideoLocation>(`admin/videos/${videoId}/location`)
  }

  /** Check (dry run) or do a move or copy. */
  run(kind: MoveKind, ids: string[], targetId: string, opts: { dryRun?: boolean; operationId?: string } = {}): Promise<ApiResponse<MoveResult>> {
    const e = ENDPOINT[kind]
    return apiService.post<MoveResult>(e.path, {
      [e.ids]: ids,
      [e.target]: targetId,
      ...(opts.dryRun ? { dry_run: true } : {}),
      ...(opts.operationId ? { operation_id: opts.operationId } : {}),
    })
  }
}

export const contentMoveService = new ContentMoveService()
