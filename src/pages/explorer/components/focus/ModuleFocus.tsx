import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Pencil, MoreHorizontal, RefreshCw, Video, Clock, Trash2, Eye, EyeOff } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { ModuleFormDialog } from '../../forms/ModuleFormDialog'
import { DeleteModuleDialog } from '../../dialogs/DeleteModuleDialog'
import { PublishDialog } from '../../dialogs/PublishDialog'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
import { modulesService } from '@/services/modules.service'
import { getParentUrl, type ExplorerFocus } from '../../parseExplorerPath'
import type { PackageDetailModule } from '@/services/packages.service'

interface ModuleFocusProps {
  module: PackageDetailModule
  focus?: ExplorerFocus
  onRefresh?: () => void
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function ModuleFocus({ module, focus, onRefresh }: ModuleFocusProps) {
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const isPublished = module.publish_status === 'published'

  const toggleMutation = useExplorerMutation({
    name: 'Toggle active',
    fn: () => modulesService.toggleActive(module._id, !module.is_active),
    onSuccess: () => onRefresh?.(),
    successMessage: module.is_active ? `"${module.name}" deactivated` : `"${module.name}" activated`,
  })

  const recalcMutation = useExplorerMutation({
    name: 'Recalculate stats',
    fn: () => modulesService.recalculateStats(module._id),
    onSuccess: () => onRefresh?.(),
    successMessage: `Stats updated for "${module.name}"`,
  })

  const handleDeleteSuccess = () => {
    setDeleteOpen(false)
    if (focus) {
      const parentUrl = getParentUrl(focus)
      if (parentUrl) navigate(parentUrl, { replace: true })
    }
    onRefresh?.()
  }

  return (
    <>
      <div className="px-5 sm:px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-blue-600">{module.display_order}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base font-semibold text-slate-900 leading-snug">{module.name}</h1>
              <div
                className="flex items-center gap-1.5"
                title={module.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
              >
                <Switch
                  checked={module.is_active}
                  onCheckedChange={toggleMutation.execute}
                  disabled={toggleMutation.loading}
                  className="scale-[0.8] origin-left"
                />
                <span className={`text-xs font-medium ${module.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {module.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {module.description && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-1 leading-relaxed">{module.description}</p>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Video className="w-3.5 h-3.5" />
                {module.lesson_count} lessons
              </span>
              {module.estimated_duration_minutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(module.estimated_duration_minutes)}
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={recalcMutation.execute}
                  disabled={recalcMutation.loading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-2 ${recalcMutation.loading ? 'animate-spin' : ''}`} />
                  Recalculate stats
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete module
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <ModuleFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onRefresh?.() }}
        seriesId={module.series_id}
        module={module}
      />

      <DeleteModuleDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onSuccess={handleDeleteSuccess}
        moduleId={module._id}
        moduleName={module.name}
      />

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onSuccess={() => { setPublishOpen(false); onRefresh?.() }}
        entityType="module"
        entityId={module._id}
        entityName={module.name}
        currentStatus={module.publish_status === 'published' ? 'published' : 'draft'}
      />
    </>
  )
}
