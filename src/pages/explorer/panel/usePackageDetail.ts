import { useEffect, useSyncExternalStore } from 'react'
import { packagesService } from '@/services/packages.service'
import { explorerCache } from '../data.cache'
import type { AnyPackage, ExplorerPackageDetail } from '../types'

/** The full package behind a list row. Read once from the folder's cache when needed. */
export function usePackageDetail(pkg: AnyPackage | null, needed: boolean) {
  useSyncExternalStore(explorerCache.subscribe, explorerCache.version)
  const own = pkg && 'bundle' in pkg ? (pkg as ExplorerPackageDetail) : null
  const key = pkg ? `package:${pkg._id}` : ''
  const entry = explorerCache.get<ExplorerPackageDetail>(key)

  useEffect(() => {
    if (!pkg || own || !needed || explorerCache.get(key).data) return
    void explorerCache.load(key, async () => {
      const res = await packagesService.getDetail(pkg._id)
      if (!res.data) throw new Error(res.message || 'This could not be loaded.')
      return res.data as ExplorerPackageDetail
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, !!own, needed])

  return { detail: own ?? entry.data, loading: !own && entry.loading, error: own ? undefined : entry.error }
}
