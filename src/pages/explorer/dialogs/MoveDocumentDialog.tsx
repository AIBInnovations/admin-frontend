import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { documentsService } from '@/services/documents.service'
import { subjectsService } from '@/services/subjects.service'
import { packagesService } from '@/services/packages.service'
import { seriesService } from '@/services/series.service'
import type { Subject } from '@/services/subjects.service'
import type { Package } from '@/services/packages.service'
import type { Series } from '@/services/series.service'

interface MoveDocumentDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  documentId: string
  documentTitle: string
}

export function MoveDocumentDialog({
  open,
  onClose,
  onSuccess,
  documentId,
  documentTitle,
}: MoveDocumentDialogProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [seriesList, setSeriesList] = useState<Series[]>([])

  const [subjectId, setSubjectId] = useState('')
  const [packageId, setPackageId] = useState('')
  const [seriesId, setSeriesId] = useState('')

  const [loadingPkgs, setLoadingPkgs] = useState(false)
  const [loadingSeries, setLoadingSeries] = useState(false)

  // Fetch subjects on every open so newly-created subjects are visible.
  useEffect(() => {
    if (!open) {
      setSubjectId('')
      setPackageId('')
      setSeriesId('')
      setPackages([])
      setSeriesList([])
      return
    }
    subjectsService.getSubjects({ limit: 100 }).then((res) => {
      if (res.success && res.data) setSubjects(res.data.entities)
    }).catch(() => {})
  }, [open])

  // Fetch packages when subject changes
  useEffect(() => {
    setPackageId('')
    setSeriesId('')
    setPackages([])
    setSeriesList([])
    if (!subjectId) return
    setLoadingPkgs(true)
    packagesService.getAll({ subject_id: subjectId, limit: 100 })
      .then((res) => { if (res.success && res.data) setPackages(res.data.entities) })
      .catch(() => {})
      .finally(() => setLoadingPkgs(false))
  }, [subjectId])

  // Fetch series when package changes
  useEffect(() => {
    setSeriesId('')
    setSeriesList([])
    if (!packageId) return
    setLoadingSeries(true)
    seriesService.getAll({ package_id: packageId, limit: 100 })
      .then((res) => { if (res.success && res.data) setSeriesList(res.data.entities) })
      .catch(() => {})
      .finally(() => setLoadingSeries(false))
  }, [packageId])

  const moveMutation = useExplorerMutation({
    name: 'Move document',
    fn: () =>
      documentsService.update(documentId, {
        series_id: (seriesId || null) as any,
        subject_id: (seriesId ? undefined : subjectId || null) as any,
      }),
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: `"${documentTitle}" moved`,
  })

  const destination = seriesId
    ? `series "${seriesList.find((s) => s._id === seriesId)?.name ?? ''}"`
    : subjectId
    ? `subject "${subjects.find((s) => s._id === subjectId)?.name ?? ''}" (no series)`
    : 'Library (no subject or series)'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-110">
        <DialogHeader>
          <DialogTitle>Move Document</DialogTitle>
          <DialogDescription>
            <strong>"{documentTitle}"</strong> — choose a new location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="mv-subject">Subject</Label>
            <select
              id="mv-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Library (no subject) —</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          {subjectId && (
            <div className="space-y-1.5">
              <Label htmlFor="mv-package">Package</Label>
              <select
                id="mv-package"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                disabled={loadingPkgs}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                <option value="">— Subject-level (no package) —</option>
                {packages.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {packageId && (
            <div className="space-y-1.5">
              <Label htmlFor="mv-series">Series</Label>
              <select
                id="mv-series"
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
                disabled={loadingSeries}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                <option value="">— Package-level (no series) —</option>
                {seriesList.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
            Will move to: {destination}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={moveMutation.loading}>
            Cancel
          </Button>
          <Button onClick={moveMutation.execute} disabled={moveMutation.loading}>
            {moveMutation.loading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Moving…</>
            ) : (
              'Move document'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
