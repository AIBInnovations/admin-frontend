import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { subjectsService, type Subject } from '@/services/subjects.service'
import { packagesService, type PackageDetailSeries, type PackageDetailModule, type PackageDetailVideo } from '@/services/packages.service'
import { documentsService, type Document } from '@/services/documents.service'
import { videosService } from '@/services/videos.service'
import { videoReviewsService, type VideoReview } from '@/services/videoReviews.service'
import { booksService, type Book } from '@/services/books.service'
import type { VideoTag } from '@/services/videoTags.service'
import { explorerCache, type Entry, type LoadError } from '../data.cache'
import { useExplorerAccess } from '../access'
import type { ExplorerPackage, ExplorerPackageDetail } from '../types'
import type { ExplorerFocus } from '../parseExplorerPath'

const PAGE = 200
const MAX_PAGES = 10

interface Page<T> { entities: T[]; pagination?: { hasNextPage?: boolean } }

/** Every page of a list (capped), so a folder is never silently cut short. */
async function readAll<T>(fetchPage: (page: number) => Promise<{ data?: Page<T>; message?: string }>): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await fetchPage(page)
    if (!res.data) throw new Error(res.message || 'This could not be loaded.')
    out.push(...(res.data.entities ?? []))
    if (!res.data.pagination?.hasNextPage) break
  }
  return out
}

async function read<T>(call: Promise<{ data?: T; message?: string }>): Promise<T> {
  const res = await call
  if (!res.data) throw new Error(res.message || 'This could not be loaded.')
  return res.data
}

interface VideoExtras { tags: VideoTag[]; reviews: VideoReview[]; total: number }

const fetchers = {
  subjects: () => readAll<Subject>((page) => subjectsService.getSubjects({ page, limit: PAGE, sort_by: 'display_order', sort_order: 'asc' })),
  subject: (id: string) => read(subjectsService.getSubject(id)),
  packages: (subjectId: string) => readAll<ExplorerPackage>((page) => packagesService.getAll({ subject_id: subjectId, page, limit: PAGE, with_counts: true } as Parameters<typeof packagesService.getAll>[0])),
  package: (id: string) => read(packagesService.getDetail(id)) as Promise<ExplorerPackageDetail>,
  // Every document of the subject, including those inside a series
  subjectDocuments: (subjectId: string) => readAll<Document>((page) => documentsService.getAll({ subject_id: subjectId, page, limit: PAGE })),
  unfiledDocuments: () => readAll<Document>((page) => documentsService.getAll({ subject_id: 'null', series_id: 'null', page, limit: PAGE })),
  books: () => readAll<Book>((page) => booksService.getAll({ page, limit: PAGE, sort_by: 'display_order', sort_order: 'asc' })),
  book: (id: string) => read(booksService.getById(id)),
  async extras(videoId: string): Promise<VideoExtras> {
    const [tags, reviews] = await Promise.allSettled([
      videosService.getVideoTags(videoId),
      videoReviewsService.getVideoReviews(videoId, { limit: 100 }),
    ])
    return {
      tags: tags.status === 'fulfilled' ? ((tags.value.data?.tags ?? tags.value.data ?? []) as VideoTag[]) : [],
      reviews: reviews.status === 'fulfilled' ? reviews.value.data?.reviews ?? [] : [],
      total: reviews.status === 'fulfilled' ? reviews.value.data?.pagination.total ?? 0 : 0,
    }
  },
}

/** Read a package's tree into the cache now (after content moved into it). */
export function loadPackage(packageId: string): Promise<void> {
  return explorerCache.load(`package:${packageId}`, () => fetchers.package(packageId))
}

export interface ExplorerData {
  loading: boolean
  /** The folder itself could not be loaded and there is nothing older to show. */
  error: LoadError | null
  /** A refresh failed; what is on screen is the last version that loaded. */
  stale: boolean
  refetch: () => Promise<void>

  subjects?: Subject[]
  subjectsError?: LoadError
  libraryDocuments?: Document[]

  books?: Book[]
  book?: Book

  subject?: Subject
  packages?: ExplorerPackage[]
  packagesError?: LoadError
  subjectDocuments?: Document[]
  documentsError?: LoadError

  packageDetail?: ExplorerPackageDetail
  currentSeries?: PackageDetailSeries
  currentModule?: PackageDetailModule
  currentVideo?: PackageDetailVideo
  videoTags?: VideoTag[]
  videoReviews?: VideoReview[]
  videoReviewsTotal?: number

  subjectName?: string
  packageName?: string
  seriesName?: string
  moduleName?: string
  videoName?: string
  bookName?: string

  /** The part of the URL that no longer exists. */
  missing?: 'subject' | 'package' | 'series' | 'module' | 'video' | 'book' | null
  /** The package moved to another subject: its real one. */
  movedToSubject?: string
}

type Can = ReturnType<typeof useExplorerAccess>['can']

/** What a folder needs, as [cache key, request]. */
function plan(focus: ExplorerFocus, can: Can): [string, () => Promise<unknown>][] {
  switch (focus.level) {
    case 'invalid': return []
    case 'root': return [
      ['subjects', fetchers.subjects],
      ...(can('document', 'read') ? [['unfiled', fetchers.unfiledDocuments] as [string, () => Promise<unknown>]] : []),
    ]
    case 'books': return can('book', 'read') ? [['books', fetchers.books]] : []
    case 'book': return can('book', 'read') ? [['books', fetchers.books], [`book:${focus.bookId}`, () => fetchers.book(focus.bookId)]] : []
    default: {
      const list: [string, () => Promise<unknown>][] = [[`subject:${focus.subjectId}`, () => fetchers.subject(focus.subjectId)]]
      if (focus.level === 'subject') {
        if (can('package', 'read')) list.push([`packages:${focus.subjectId}`, () => fetchers.packages(focus.subjectId)])
        if (can('document', 'read')) list.push([`documents:${focus.subjectId}`, () => fetchers.subjectDocuments(focus.subjectId)])
        return list
      }
      if (can('package', 'read')) list.push([`package:${focus.packageId}`, () => fetchers.package(focus.packageId)])
      if (focus.level === 'video' && can('video', 'read')) list.push([`extras:${focus.videoId}`, () => fetchers.extras(focus.videoId)])
      return list
    }
  }
}

const gone = (e: Entry) => !e.loading && !e.data && (e.error?.status === 404 || e.error?.status === 400)

/** Being fetched, or about to be: an answer is on its way. */
const busy = (e: Entry, wanted = true) => wanted && (e.loading || (!e.data && !e.error))

function assemble(focus: ExplorerFocus, can: Can): Omit<ExplorerData, 'refetch'> {
  const get = explorerCache.get
  const base = { loading: false, error: null, stale: false }

  if (focus.level === 'invalid') return base

  if (focus.level === 'root') {
    const subjects = get<Subject[]>('subjects')
    const unfiled = get<Document[]>('unfiled')
    return {
      loading: busy(subjects) || busy(unfiled, can('document', 'read')),
      error: !subjects.data ? subjects.error ?? null : null,
      stale: !!subjects.data && !!subjects.error,
      subjects: subjects.data,
      libraryDocuments: unfiled.data,
    }
  }

  if (focus.level === 'books' || focus.level === 'book') {
    const books = get<Book[]>('books')
    const bookId = focus.level === 'book' ? focus.bookId : null
    const single = bookId ? get<Book>(`book:${bookId}`) : null
    const book = single ? books.data?.find((b) => b._id === bookId) ?? single.data : undefined
    return {
      loading: can('book', 'read') && (busy(books) || (!!single && busy(single))),
      error: !books.data ? books.error ?? null : null,
      stale: !!books.data && !!books.error,
      books: books.data,
      book,
      bookName: book?.title,
      missing: single && !book && gone(single) ? 'book' : null,
    }
  }

  const subjectEntry = get<Subject>(`subject:${focus.subjectId}`)
  const subject = subjectEntry.data ?? get<Subject[]>('subjects').data?.find((s) => s._id === focus.subjectId)
  const subjectGone = gone(subjectEntry)

  if (focus.level === 'subject') {
    const packages = get<ExplorerPackage[]>(`packages:${focus.subjectId}`)
    const documents = get<Document[]>(`documents:${focus.subjectId}`)
    return {
      loading: busy(subjectEntry) || busy(packages, can('package', 'read')) || busy(documents, can('document', 'read')),
      error: !subject && !subjectGone ? subjectEntry.error ?? null : null,
      stale: (!!subject && !!subjectEntry.error) || (!!packages.data && !!packages.error) || (!!documents.data && !!documents.error),
      subject,
      subjectName: subject?.name,
      packages: packages.data,
      packagesError: packages.data ? undefined : packages.error,
      subjectDocuments: documents.data,
      documentsError: documents.data ? undefined : documents.error,
      missing: subjectGone ? 'subject' : null,
    }
  }

  const pkgEntry = get<ExplorerPackageDetail>(`package:${focus.packageId}`)
  const pkg = pkgEntry.data
  const common = {
    loading: busy(subjectEntry) || busy(pkgEntry, can('package', 'read')),
    error: !pkg && !gone(pkgEntry) ? pkgEntry.error ?? (!subject && !subjectGone ? subjectEntry.error ?? null : null) : null,
    stale: !!pkg && !!pkgEntry.error,
    subject,
    subjectName: subject?.name ?? (pkg && typeof pkg.subject_id === 'object' ? pkg.subject_id?.name : undefined),
    packageDetail: pkg,
    packageName: pkg?.name,
  }
  if (!pkg) return { ...common, missing: subjectGone ? 'subject' : gone(pkgEntry) ? 'package' : null }

  const realSubject = typeof pkg.subject_id === 'object' ? pkg.subject_id?._id : (pkg.subject_id as string | undefined)
  if (realSubject && realSubject !== focus.subjectId) return { ...common, movedToSubject: realSubject }
  if (subjectGone) return { ...common, missing: 'subject' }
  if (focus.level === 'package') return { ...common, missing: null }

  const currentSeries = pkg.series?.find((s) => s._id === focus.seriesId)
  if (!currentSeries) return { ...common, missing: pkgEntry.loading ? null : 'series' }
  const withSeries = { ...common, currentSeries, seriesName: currentSeries.name }
  if (focus.level === 'series') return { ...withSeries, missing: null }

  const currentModule = currentSeries.modules?.find((m) => m._id === focus.moduleId)
  if (!currentModule) return { ...withSeries, missing: pkgEntry.loading ? null : 'module' }
  const withModule = { ...withSeries, currentModule, moduleName: currentModule.name }
  if (focus.level === 'module') return { ...withModule, missing: null }

  const currentVideo = currentModule.videos?.find((v) => v._id === focus.videoId)
  if (!currentVideo) return { ...withModule, missing: pkgEntry.loading ? null : 'video' }
  const extras = get<VideoExtras>(`extras:${focus.videoId}`)
  return {
    ...withModule,
    loading: withModule.loading || busy(extras, can('video', 'read')),
    currentVideo,
    videoName: currentVideo.title,
    videoTags: extras.data?.tags,
    videoReviews: extras.data?.reviews,
    videoReviewsTotal: extras.data?.total,
    missing: null,
  }
}

export function useExplorerData(focus: ExplorerFocus): ExplorerData {
  const { can, viewer } = useExplorerAccess()
  explorerCache.setOwner(viewer)
  const version = useSyncExternalStore(explorerCache.subscribe, explorerCache.version)
  const key = JSON.stringify(focus)

  const refetch = useCallback(async () => {
    await Promise.all(plan(focus, can).map(([k, fetcher]) => explorerCache.load(k, fetcher)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, can])

  // Show what we know, refresh it behind the scenes.
  useEffect(() => { void refetch() }, [refetch])

  const data = useMemo(() => assemble(focus, can), [key, version, can]) // eslint-disable-line react-hooks/exhaustive-deps
  return useMemo(() => ({ ...data, refetch }), [data, refetch])
}
