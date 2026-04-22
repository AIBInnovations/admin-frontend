import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { subjectsService } from '@/services/subjects.service'
import { packagesService } from '@/services/packages.service'
import { documentsService } from '@/services/documents.service'
import type { Subject, SubjectDetail } from '@/services/subjects.service'
import type { Package, PackageDetail, PackageDetailSeries, PackageDetailModule } from '@/services/packages.service'
import type { Document } from '@/services/documents.service'
import type { ExplorerFocus } from '../parseExplorerPath'

export interface ExplorerData {
  loading: boolean
  error: string | null
  refetch: () => void

  // Root
  subjects?: Subject[]
  libraryDocuments?: Document[]

  // Subject focus
  subject?: SubjectDetail
  packages?: Package[]
  subjectDocuments?: Document[]

  // Package+ (full tree)
  packageDetail?: PackageDetail

  // Derived (series/module level — plucked from packageDetail)
  currentSeries?: PackageDetailSeries
  currentModule?: PackageDetailModule

  // Breadcrumb names
  subjectName?: string
  packageName?: string
  seriesName?: string
  moduleName?: string

  // Chain-mismatch signalling for the page shell
  missing?: 'subject' | 'package' | 'series' | 'module' | null
}

type CacheMap = Map<string, unknown>

// Build a stable string key for a focus so reference identity doesn't churn.
function focusKey(focus: ExplorerFocus): string {
  switch (focus.level) {
    case 'root': return 'root'
    case 'subject': return `s:${focus.subjectId}`
    case 'package': return `p:${focus.subjectId}:${focus.packageId}`
    case 'series': return `sr:${focus.subjectId}:${focus.packageId}:${focus.seriesId}`
    case 'module': return `m:${focus.subjectId}:${focus.packageId}:${focus.seriesId}:${focus.moduleId}`
    case 'invalid': return `invalid:${focus.reason}`
  }
}

// Keys that describe the current branch of the tree.
function branchKeys(focus: ExplorerFocus): string[] {
  if (focus.level === 'root' || focus.level === 'invalid') {
    return ['root.subjects', 'root.library']
  }
  const keys = [
    `subject:${focus.subjectId}`,
    `subject:${focus.subjectId}.packages`,
    `subject:${focus.subjectId}.documents`,
  ]
  if ('packageId' in focus) keys.push(`package:${focus.packageId}`)
  return keys
}

export function useExplorerData(focus: ExplorerFocus): ExplorerData {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Omit<ExplorerData, 'loading' | 'error' | 'refetch'>>({})
  const cacheRef = useRef<CacheMap>(new Map())
  const fetchIdRef = useRef(0)

  // Stabilise focus identity — same values => same reference across renders.
  const stableFocus = useMemo(() => focus, [focusKey(focus)])

  const load = useCallback(async () => {
    const fetchId = ++fetchIdRef.current
    setLoading(true)
    setError(null)

    const cache = cacheRef.current

    try {
      if (stableFocus.level === 'invalid') {
        setData({})
        return
      }

      if (stableFocus.level === 'root') {
        // Optimistic: paint cached immediately.
        const cachedSubjects = cache.get('root.subjects') as Subject[] | undefined
        const cachedLib = cache.get('root.library') as Document[] | undefined
        if (cachedSubjects || cachedLib) {
          setData({ subjects: cachedSubjects, libraryDocuments: cachedLib })
        }

        // allSettled — a 4xx on orphan docs must not blank out the subjects
        // list (and vice versa). Each sub-fetch is independent.
        const [subjectsRes, libRes] = await Promise.allSettled([
          subjectsService.getSubjects({ page: 1, limit: 200, sort_by: 'display_order', sort_order: 'asc' }),
          documentsService.getAll({ subject_id: 'null', series_id: 'null', limit: 200 }),
        ])

        if (fetchId !== fetchIdRef.current) return

        const subjects =
          subjectsRes.status === 'fulfilled' && subjectsRes.value.success && subjectsRes.value.data
            ? subjectsRes.value.data.entities
            : cachedSubjects
        const libraryDocuments =
          libRes.status === 'fulfilled' && libRes.value.success && libRes.value.data
            ? libRes.value.data.entities
            : cachedLib

        if (subjects) cache.set('root.subjects', subjects)
        if (libraryDocuments) cache.set('root.library', libraryDocuments)

        setData({ subjects, libraryDocuments, missing: null })
        return
      }

      // Subject+ : always fetch subject detail (but show cached immediately).
      const subjectCacheKey = `subject:${stableFocus.subjectId}`
      const cachedSubject = cache.get(subjectCacheKey) as SubjectDetail | undefined

      if (cachedSubject) {
        setData((prev) => ({ ...prev, subject: cachedSubject, subjectName: cachedSubject.name }))
      }

      const subjRes = await subjectsService.getSubject(stableFocus.subjectId)
      if (fetchId !== fetchIdRef.current) return

      let subject: SubjectDetail | undefined
      if (subjRes.success && subjRes.data) {
        subject = subjRes.data
        cache.set(subjectCacheKey, subject)
      } else {
        subject = cachedSubject
      }

      if (!subject) {
        setData({ missing: 'subject' })
        return
      }

      if (stableFocus.level === 'subject') {
        const pkgCacheKey = `subject:${stableFocus.subjectId}.packages`
        const docCacheKey = `subject:${stableFocus.subjectId}.documents`

        const cachedPkgs = cache.get(pkgCacheKey) as Package[] | undefined
        const cachedDocs = cache.get(docCacheKey) as Document[] | undefined
        if (cachedPkgs || cachedDocs) {
          setData({
            subject,
            packages: cachedPkgs,
            subjectDocuments: cachedDocs,
            subjectName: subject.name,
          })
        }

        const [pkgRes, docRes] = await Promise.allSettled([
          packagesService.getAll({
            subject_id: stableFocus.subjectId,
            page: 1,
            limit: 200,
          } as Parameters<typeof packagesService.getAll>[0]),
          documentsService.getAll({
            subject_id: stableFocus.subjectId,
            series_id: 'null',
            limit: 200,
          }),
        ])
        if (fetchId !== fetchIdRef.current) return

        const packages =
          pkgRes.status === 'fulfilled' && pkgRes.value.success && pkgRes.value.data
            ? pkgRes.value.data.entities
            : cachedPkgs
        const subjectDocuments =
          docRes.status === 'fulfilled' && docRes.value.success && docRes.value.data
            ? docRes.value.data.entities
            : cachedDocs

        if (packages) cache.set(pkgCacheKey, packages)
        if (subjectDocuments) cache.set(docCacheKey, subjectDocuments)

        setData({
          subject,
          packages,
          subjectDocuments,
          subjectName: subject.name,
          missing: null,
        })
        return
      }

      // Package+ : always fetch package detail tree (show cached in the meantime).
      const pkgDetailKey = `package:${stableFocus.packageId}`
      const cachedPkgDetail = cache.get(pkgDetailKey) as PackageDetail | undefined
      if (cachedPkgDetail) {
        setData((prev) => ({
          ...prev,
          subject,
          packageDetail: cachedPkgDetail,
          subjectName: subject.name,
          packageName: cachedPkgDetail.name,
        }))
      }

      const detailRes = await packagesService.getDetail(stableFocus.packageId)
      if (fetchId !== fetchIdRef.current) return

      let packageDetail: PackageDetail | undefined
      if (detailRes.success && detailRes.data) {
        packageDetail = detailRes.data
        cache.set(pkgDetailKey, packageDetail)
      } else {
        packageDetail = cachedPkgDetail
      }

      if (!packageDetail) {
        setData({ subject, missing: 'package', subjectName: subject.name })
        return
      }

      const subjectName =
        subject.name ??
        (typeof packageDetail.subject_id === 'object' ? packageDetail.subject_id?.name : undefined)

      if (stableFocus.level === 'package') {
        setData({
          subject,
          packageDetail,
          subjectName,
          packageName: packageDetail.name,
          missing: null,
        })
        return
      }

      const currentSeries = packageDetail.series?.find((s) => s._id === stableFocus.seriesId)

      if (!currentSeries) {
        setData({
          subject,
          packageDetail,
          subjectName,
          packageName: packageDetail.name,
          missing: 'series',
        })
        return
      }

      if (stableFocus.level === 'series') {
        setData({
          subject,
          packageDetail,
          currentSeries,
          subjectName,
          packageName: packageDetail.name,
          seriesName: currentSeries.name,
          missing: null,
        })
        return
      }

      if (stableFocus.level === 'module') {
        const currentModule = currentSeries.modules?.find((m) => m._id === stableFocus.moduleId)
        setData({
          subject,
          packageDetail,
          currentSeries,
          currentModule,
          subjectName,
          packageName: packageDetail.name,
          seriesName: currentSeries.name,
          moduleName: currentModule?.name,
          missing: currentModule ? null : 'module',
        })
      }
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return
      const msg = err instanceof Error ? err.message : 'Failed to load'
      setError(msg)
      toast.error('Failed to load content', { description: msg })
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false)
    }
  }, [stableFocus])

  useEffect(() => {
    load()
  }, [load])

  // Refetch with targeted cache invalidation on the current branch.
  const refetch = useCallback(() => {
    const cache = cacheRef.current
    for (const key of branchKeys(stableFocus)) cache.delete(key)
    load()
  }, [stableFocus, load])

  return {
    loading,
    error,
    refetch,
    ...data,
  }
}
