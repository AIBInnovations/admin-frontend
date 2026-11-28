import { useEffect, useState } from 'react'
import { Package as PackageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { packagesService, type Package } from '@/services/packages.service'
import { FolderLink } from '../components/FolderLink'
import { EXPLORER_BASE } from '../parseExplorerPath'
import { explain } from '../access'
import { ActiveBadge, PublishBadge } from '../ui/StatusBadge'
import { Thumb } from '../ui/Thumb'
import { hours, plural } from '../ui/text'
import type { AnyPackage, BundledPackage, ContentCounts } from '../types'
import { PanelField, PanelSectionTitle, PanelSelect } from './fields'
import { refId, refName } from './helpers'
import { usePackageDetail } from './usePackageDetail'

export function describeContents(c: ContentCounts | undefined): string {
  if (!c) return ''
  return [
    plural(c.series_count, 'series', 'series'),
    plural(c.module_count, 'module'),
    plural(c.video_count, 'video') + (c.duration_seconds > 0 ? ` (${hours(c.duration_seconds)})` : ''),
    plural(c.document_count, 'document'),
  ].join(', ')
}

/** One package inside a combo, as it is right now. */
export function BundledRow({ pkg, onRemove }: { pkg: BundledPackage; onRemove?: () => void }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <Thumb src={pkg.thumbnail_url} fallback={<PackageIcon className="h-4 w-4" />} className="h-11 w-16" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <FolderLink href={`${EXPLORER_BASE}/subjects/${pkg.subject._id}/packages/${pkg._id}`} className="min-w-0 break-words text-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline">{pkg.name}</FolderLink>
          {pkg.publish_status === 'draft' && <PublishBadge status="draft" />}
          {!pkg.is_active && <ActiveBadge active={false} />}
        </div>
        <p className="text-xs text-muted-foreground">{[pkg.subject.name ?? 'Deleted subject', describeContents(pkg)].join(' · ')}</p>
        {pkg.description && <p className="mt-1 line-clamp-2 break-words text-xs text-foreground/80">{pkg.description}</p>}
      </div>
      {onRemove && <Button type="button" variant="ghost" size="icon" aria-label={`Take ${pkg.name} out of the combo`} onClick={onRemove} className="h-7 w-7 shrink-0 text-muted-foreground"><X className="h-3.5 w-3.5" /></Button>}
    </li>
  )
}

interface Props {
  pkg: AnyPackage | null
  ids: string[]
  onChange: (ids: string[]) => void
  readOnly: boolean
}

/** Which packages a combo includes, with what they really hold. */
export function BundleEditor({ pkg, ids, onChange, readOnly }: Props) {
  const { detail, loading, error } = usePackageDetail(pkg, ids.length > 0)
  const [choices, setChoices] = useState<{ list: Package[]; error: string | null; loading: boolean }>({ list: [], error: null, loading: !readOnly })

  useEffect(() => {
    if (readOnly) return
    let live = true
    packagesService.getAll({ page: 1, limit: 500 })
      .then((res) => {
        if (!live) return
        // A combo cannot include itself or another combo
        const list = (res.data?.entities ?? []).filter((p) => p._id !== pkg?._id && (p.bundled_package_ids ?? []).length === 0)
        setChoices({ list, error: null, loading: false })
      })
      .catch((err) => { if (live) setChoices({ list: [], error: explain(err, 'packages'), loading: false }) })
    return () => { live = false }
  }, [readOnly, pkg?._id])

  if (readOnly && ids.length === 0) return null

  const saved = new Map((detail?.bundle?.packages ?? []).map((p) => [p._id, p]))
  const nameOf = (id: string) => choices.list.find((p) => p._id === id)?.name ?? refName((pkg?.bundled_package_ids ?? []).find((p) => refId(p) === id)) ?? 'Deleted package'
  const missing = detail?.bundle?.missing_count ?? 0
  const bySubject = new Map<string, Package[]>()
  for (const p of choices.list) {
    if (ids.includes(p._id)) continue
    const subject = refName(p.subject_id) ?? 'Other'
    bySubject.set(subject, [...(bySubject.get(subject) ?? []), p])
  }

  return (
    <section aria-label="Included packages" className="space-y-3">
      <PanelSectionTitle>Included packages ({ids.length})</PanelSectionTitle>
      {ids.length === 0 && <p className="text-[13px] text-muted-foreground">Add packages here to make this a combo: buying it gives access to all of them.</p>}
      {ids.length > 0 && detail?.content_summary && <p className="text-[13px] text-foreground">Together: {describeContents(detail.content_summary)}.</p>}
      {error && <p role="alert" className="text-[13px] text-danger">What these packages hold could not be loaded. {error.message}</p>}
      {missing > 0 && <p className="text-[13px] text-warning">{plural(missing, 'included package')} no longer {missing === 1 ? 'exists' : 'exist'}.</p>}
      {ids.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {ids.map((id) => {
            const remove = readOnly ? undefined : () => onChange(ids.filter((x) => x !== id))
            const known = saved.get(id)
            if (known) return <BundledRow key={id} pkg={known} onRemove={remove} />
            if (loading) return <li key={id} className="flex items-center gap-3 px-3 py-3"><Skeleton className="h-11 w-16" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></li>
            return (
              <li key={id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="min-w-0 flex-1 break-words text-sm font-medium">{nameOf(id)}<span className="block text-xs font-normal text-muted-foreground">Added when you save</span></span>
                {remove && <Button type="button" variant="ghost" size="icon" aria-label={`Take ${nameOf(id)} out of the combo`} onClick={remove} className="h-7 w-7 text-muted-foreground"><X className="h-3.5 w-3.5" /></Button>}
              </li>
            )
          })}
        </ul>
      )}
      {!readOnly && (
        <PanelField label="Add a package" htmlFor="bundle-add" error={choices.error ?? undefined}>
          <PanelSelect id="bundle-add" value="" onChange={(id) => { if (id) onChange([...ids, id]) }} disabled={choices.loading}>
            <option value="">{choices.loading ? 'Loading packages…' : 'Choose a package'}</option>
            {[...bySubject].map(([subject, list]) => (
              <optgroup key={subject} label={subject}>{list.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</optgroup>
            ))}
          </PanelSelect>
        </PanelField>
      )}
    </section>
  )
}
