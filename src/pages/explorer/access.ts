import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { PanelEntityKind } from './panel/panelTypes'

export type ExplorerAction = 'read' | 'create' | 'update' | 'delete'

/** Backend permission area of each kind (see backend/src/routes/admin). */
const RESOURCE: Record<PanelEntityKind, string> = {
  subject: 'subjects',
  package: 'packages',
  series: 'series',
  module: 'modules',
  video: 'videos',
  document: 'documents',
  book: 'books',
}

export const PLURAL: Record<PanelEntityKind, string> = {
  subject: 'subjects',
  package: 'packages',
  series: 'series',
  module: 'modules',
  video: 'videos',
  document: 'documents',
  book: 'books',
}

export function useExplorerAccess() {
  const { hasPermission, user } = useAuth()
  return useMemo(() => ({
    can: (kind: PanelEntityKind, action: ExplorerAction) => hasPermission(`${RESOURCE[kind]}.${action}`),
    has: hasPermission,
    viewer: user?.admin_id ?? user?.email ?? 'anonymous',
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user])
}

interface ApiError extends Error { status?: number }

export function errorStatus(err: unknown): number | undefined {
  return (err as ApiError | null)?.status
}

/** What went wrong, in words the admin can act on. `what` names the thing, e.g. "packages". */
export function explain(err: unknown, what: string): string {
  const status = errorStatus(err)
  if (status === 403) return `You do not have access to ${what}. Ask a super admin for the permission.`
  if (status === 408) return 'The server took too long to answer. Check the result before trying again.'
  return err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.'
}
