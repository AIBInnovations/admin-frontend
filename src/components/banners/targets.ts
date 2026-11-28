import { booksService, type Book } from '@/services/books.service'
import { liveSessionsService } from '@/services/liveSessions.service'
import { packagesService, type Package } from '@/services/packages.service'
import { packageTypesService, type PackageType } from '@/services/packageTypes.service'
import { workshopsService } from '@/services/workshops.service'
import { loadAll, type PickOption } from '@/components/forms/editor/pickers'
import { istDay } from '@/components/forms/editor/ist'

// What a banner or a home section item can open in the app.

function typeName(pkg: Package): string {
  const ref = pkg.package_type_id as unknown
  return ref && typeof ref === 'object' && 'name' in ref ? String((ref as { name: string }).name).toLowerCase() : ''
}

async function packagesWithTypes(): Promise<{ packages: Package[]; types: PackageType[] }> {
  const [packages, types] = await Promise.all([
    loadAll((page) => packagesService.getAll({ page, limit: 100, is_active: true })),
    // Only a fallback for packages whose type did not come populated
    packageTypesService.getAllPublic().then((r) => r.data ?? []).catch(() => [] as PackageType[]),
  ])
  return { packages, types }
}

const option = (p: Package): PickOption => ({ id: p._id, name: p.name, sub: p.subject_id?.name })

export const loadPackagesOfType = (wanted: 'theory' | 'practical') => async (): Promise<PickOption[]> => {
  const { packages, types } = await packagesWithTypes()
  const typeId = types.find((t) => t.name.toLowerCase() === wanted)?._id
  return packages
    .filter((p) => {
      const name = typeName(p)
      if (name) return name === wanted
      const ref = p.package_type_id as unknown
      const id = ref && typeof ref === 'object' ? (ref as { _id?: string })._id : (ref as string | null)
      return !!typeId && id === typeId
    })
    .map(option)
}

/** A combo is a package that bundles others; its type name can be edited, so the bundle decides. */
export const loadComboPackages = async (): Promise<PickOption[]> => {
  const { packages } = await packagesWithTypes()
  return packages.filter((p) => (p.bundled_package_ids || []).length > 0 || typeName(p).includes('combo')).map(option)
}

export const loadEbooks = async (): Promise<PickOption[]> => {
  const rows = await loadAll<Book>((page) => booksService.getAll({ page, limit: 100, is_available: true } as never))
  return rows.filter((b) => b.ebook).map((b) => ({ id: b._id, name: b.title, sub: b.author || undefined }))
}

export const loadUpcomingSessions = async (): Promise<PickOption[]> => {
  const rows = await loadAll((page) => liveSessionsService.getAll({ page, limit: 100, publish_status: 'published' }))
  return rows
    .filter((s) => s.status === 'scheduled' || s.status === 'live')
    .map((s) => ({ id: s._id, name: s.title, sub: s.scheduled_start_time ? istDay(s.scheduled_start_time) : undefined }))
}

export const loadPublishedWorkshops = async (): Promise<PickOption[]> => {
  const rows = await loadAll((page) => workshopsService.getAll({ page, limit: 100, publish_status: 'published' }))
  return rows.map((w) => ({ id: w._id, name: w.title, sub: w.start_date ? istDay(w.start_date) : undefined }))
}
