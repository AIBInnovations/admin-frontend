import { useState } from 'react'
import { Download, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { videoAnalyticsService, type VideoExport, type VideoQuery } from '@/services/videoAnalytics.service'

/** The same control as the other Analytics exports, for the video reports. */
export function VideoExportButton({ report, query, label = 'Export CSV' }: { report: VideoExport; query: VideoQuery; label?: string }) {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          const { filename } = await videoAnalyticsService.exportCsv(report, { ...query, page: undefined, limit: undefined })
          toast.success(`Exported ${filename}`)
        } catch (err) {
          toast.error(err instanceof Error && err.message ? err.message : 'The export failed. Please try again.')
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {busy ? 'Exporting…' : label}
    </Button>
  )
}
