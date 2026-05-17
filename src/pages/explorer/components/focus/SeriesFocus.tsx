import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Pencil, MoreHorizontal, CalendarClock, Layers, FileText, Eye, EyeOff } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { SeriesFormDialog } from '../../forms/SeriesFormDialog'
import { PublishDialog } from '../../dialogs/PublishDialog'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
import { seriesService } from '@/services/series.service'
import { toast } from 'sonner'
import type { PackageDetailSeries } from '@/services/packages.service'

interface SeriesFocusProps {
  series: PackageDetailSeries
  isTheory?: boolean
  onRefresh?: () => void
}

export function SeriesFocus({ series, isTheory, onRefresh }: SeriesFocusProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const isPublished = series.publish_status === 'published'

  const toggleMutation = useExplorerMutation({
    name: 'Toggle active',
    fn: () => seriesService.toggleActive(series._id, !series.is_active),
    onSuccess: () => onRefresh?.(),
    successMessage: series.is_active ? `"${series.name}" deactivated` : `"${series.name}" activated`,
  })

  return (
    <>
      <div className="px-5 sm:px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-violet-700">S{series.display_order}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base font-semibold text-slate-900 leading-snug">{series.name}</h1>
              <div
                className="flex items-center gap-1.5"
                title={series.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
              >
                <Switch
                  checked={series.is_active}
                  onCheckedChange={toggleMutation.execute}
                  disabled={toggleMutation.loading}
                  className="scale-[0.8] origin-left"
                />
                <span className={`text-xs font-medium ${series.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {series.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {series.description && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-1 leading-relaxed">{series.description}</p>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {series.module_count} modules
              </span>
              {isTheory && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {series.document_count} documents
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-slate-600 border-slate-200 hover:bg-slate-50"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className={`gap-1.5 h-8 ${isPublished
                ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              onClick={() => setPublishOpen(true)}
            >
              {isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isPublished ? 'Unpublish' : 'Publish'}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => toast.info('Schedule document release — coming soon')}>
                  <CalendarClock className="w-3.5 h-3.5 mr-2" /> Schedule document release
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <SeriesFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onRefresh?.() }}
        packageId={series.package_id}
        series={series}
      />

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onSuccess={() => { setPublishOpen(false); onRefresh?.() }}
        entityType="series"
        entityId={series._id}
        entityName={series.name}
        currentStatus={series.publish_status === 'published' ? 'published' : 'draft'}
      />
    </>
  )
}
