import { useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { DetailSkeleton, ErrorState } from '@/components/common/detail'
import { PackageForm } from '@/components/packages/PackageForm'
import { unwrap, useResource } from '@/components/users/lib'
import { packagesService, type PackageDetail } from '@/services/packages.service'

/** /content/packages/new (?subject=) and /content/packages/:packageId/edit */
export function PackageEditorPage() {
  const { packageId } = useParams<{ packageId: string }>()
  const [params] = useSearchParams()
  const mode = packageId ? 'edit' : 'create'
  const { data: pkg, loading, error, status, reload } = useResource<PackageDetail | null>(
    async () => (packageId ? unwrap(await packagesService.getDetail(packageId), 'Package not found') : null), [packageId],
  )

  if (mode === 'edit' && !pkg) {
    if (loading) return <DetailSkeleton />
    const gone = status === 404 || status === 400
    return <ErrorState title={gone ? 'Package not found' : 'This package could not be loaded'} message={gone ? 'It may have been deleted, or the link is wrong.' : error ?? undefined} onRetry={gone ? undefined : () => reload()} back={{ label: 'Back to Packages', href: '/content/packages' }} />
  }

  const title = mode === 'create' ? 'Create Package' : 'Edit Package'
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={mode === 'create' ? 'Add a new course package.' : 'Update the package details below.'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Packages', href: '/content/packages' },
          ...(pkg ? [{ label: pkg.name, href: `/content/packages/${pkg._id}` }] : []), { label: title },
        ]}
      />
      <PackageForm key={pkg ? `${pkg._id}:${pkg.updatedAt}` : 'new'} mode={mode} pkg={pkg} defaultSubjectId={params.get('subject') || undefined} onReload={() => reload()} />
    </div>
  )
}
