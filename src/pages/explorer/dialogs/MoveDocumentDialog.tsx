import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { documentsService, type DocumentFormData } from '@/services/documents.service'
import { packagesService } from '@/services/packages.service'
import { seriesService } from '@/services/series.service'
import { subjectsService } from '@/services/subjects.service'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { PanelField, PanelSelect } from '../panel/fields'
import { explain } from '../access'
import { parseExplorerPath } from '../parseExplorerPath'

interface Ref { _id: string; name: string }
interface Options { list: Ref[]; loading: boolean; error: string | null }
const NONE: Options = { list: [], loading: false, error: null }

/** A list that belongs to the current parent; answers for an older parent are dropped. */
function useOptions(parent: string | null, load: (parent: string) => Promise<Ref[]>, what: string): Options {
  const [state, setState] = useState<Options>(NONE)
  useEffect(() => {
    if (parent === null) { setState(NONE); return }
    let live = true
    setState({ list: [], loading: true, error: null })
    load(parent)
      .then((list) => { if (live) setState({ list, loading: false, error: null }) })
      .catch((err) => { if (live) setState({ list: [], loading: false, error: explain(err, what) }) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent])
  return state
}

interface Props { documentId: string; documentTitle: string; onClose: () => void; onSuccess: () => Promise<void> | void }

export function MoveDocumentDialog({ documentId, documentTitle, onClose, onSuccess }: Props) {
  // Start from where it is now
  const { pathname } = useLocation()
  const [start] = useState(() => {
    const focus = parseExplorerPath(pathname)
    return {
      subject: 'subjectId' in focus ? focus.subjectId : '',
      package: 'seriesId' in focus ? focus.packageId : '',
      series: 'seriesId' in focus ? focus.seriesId : '',
    }
  })
  const [subjectId, setSubjectId] = useState(start.subject)
  const [packageId, setPackageId] = useState(start.package)
  const [seriesId, setSeriesId] = useState(start.series)
  const unchanged = !!start.series && seriesId === start.series

  const subjects = useOptions('all', async () => (await subjectsService.getSubjects({ page: 1, limit: 200 })).data?.entities ?? [], 'subjects')
  const packages = useOptions(subjectId || null, async (id) => (await packagesService.getAll({ subject_id: id, page: 1, limit: 200 })).data?.entities ?? [], 'packages')
  const series = useOptions(packageId || null, async (id) => (await seriesService.getAll({ package_id: id, page: 1, limit: 200 })).data?.entities ?? [], 'series')

  const pickSubject = (id: string) => { setSubjectId(id); setPackageId(''); setSeriesId('') }
  const pickPackage = (id: string) => { setPackageId(id); setSeriesId('') }
  const nameIn = (o: Options, id: string) => o.list.find((x) => x._id === id)?.name ?? ''

  const move = useExplorerMutation({
    name: 'Move document',
    what: 'moving documents',
    fn: () => documentsService.update(documentId, {
      series_id: seriesId || null,
      // Inside a series the subject comes from the series
      ...(seriesId ? {} : { subject_id: subjectId || null }),
    } as unknown as DocumentFormData),
    onSuccess: () => onSuccess(),
    successMessage: `"${documentTitle}" moved`,
  })

  const destination = seriesId
    ? `the series "${nameIn(series, seriesId)}"`
    : subjectId ? `the subject "${nameIn(subjects, subjectId)}", outside any series` : 'the unfiled documents (no subject or series)'
  const problem = subjects.error ?? packages.error ?? series.error

  return (
    <Dialog variant="dock" open onOpenChange={(v) => { if (!v && !move.loading) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move document</DialogTitle>
          <DialogDescription>Choose where <strong className="break-words font-medium text-foreground">{documentTitle}</strong> belongs.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <PanelField label="Subject" htmlFor="mv-subject">
            <PanelSelect id="mv-subject" value={subjectId} onChange={pickSubject} disabled={subjects.loading}>
              <option value="">{subjects.loading ? 'Loading…' : 'No subject'}</option>
              {subjects.list.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </PanelSelect>
          </PanelField>
          <PanelField label="Package" htmlFor="mv-package">
            <PanelSelect id="mv-package" value={packageId} onChange={pickPackage} disabled={!subjectId || packages.loading}>
              <option value="">{packages.loading ? 'Loading…' : 'No package'}</option>
              {packages.list.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </PanelSelect>
          </PanelField>
          <PanelField label="Series" htmlFor="mv-series">
            <PanelSelect id="mv-series" value={seriesId} onChange={setSeriesId} disabled={!packageId || series.loading}>
              <option value="">{series.loading ? 'Loading…' : packageId ? 'Choose a series' : 'No series'}</option>
              {series.list.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </PanelSelect>
          </PanelField>
        </div>
        {problem && <p role="alert" className="text-sm text-danger">{problem}</p>}
        <p aria-live="polite" className="text-sm text-muted-foreground">{unchanged ? 'This is where it is now.' : `It will move to ${destination}.`}{packageId && !seriesId ? ' Choose a series to put it inside the package.' : ''}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={move.loading}>Cancel</Button>
          <Button onClick={() => void move.execute()} disabled={move.loading || unchanged || (!!packageId && !seriesId)}>
            {move.loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Moving…</> : 'Move document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
