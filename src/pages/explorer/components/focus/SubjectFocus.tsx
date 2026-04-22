import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Pencil, Package, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react'
import { SubjectFormDialog } from '../../forms/SubjectFormDialog'
import { DeleteSubjectDialog } from '../../dialogs/DeleteSubjectDialog'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
import { subjectsService } from '@/services/subjects.service'
import { EXPLORER_BASE } from '../../parseExplorerPath'
import type { SubjectDetail } from '@/services/subjects.service'

interface SubjectFocusProps {
  subject: SubjectDetail
  onRefresh?: () => void
}

export function SubjectFocus({ subject, onRefresh }: SubjectFocusProps) {
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleDeleteSuccess = () => {
    setDeleteOpen(false)
    navigate(EXPLORER_BASE, { replace: true })
  }

  const toggleMutation = useExplorerMutation({
    name: 'Toggle active',
    fn: () => subjectsService.toggleActive(subject._id, !subject.is_active),
    onSuccess: () => onRefresh?.(),
    successMessage: subject.is_active ? `"${subject.name}" deactivated` : `"${subject.name}" activated`,
  })

  return (
    <>
      <div className="px-5 sm:px-6 py-5">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12 rounded-xl shrink-0">
            {subject.icon_url && <AvatarImage src={subject.icon_url} alt={subject.name} />}
            <AvatarFallback className="rounded-xl bg-indigo-100 text-indigo-700 text-base font-bold">
              {subject.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base font-semibold text-slate-900 leading-snug">{subject.name}</h1>
              <div
                className="flex items-center gap-1.5"
                title={subject.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
              >
                <Switch
                  checked={subject.is_active}
                  onCheckedChange={toggleMutation.execute}
                  disabled={toggleMutation.loading}
                  className="scale-[0.8] origin-left"
                />
                <span className={`text-xs font-medium ${subject.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {subject.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {subject.description && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">{subject.description}</p>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {subject.packages?.length ?? 0} packages
              </span>
              {subject.whatsapp_community_link && (
                <a
                  href={subject.whatsapp_community_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Community
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-slate-600 border-slate-200 hover:bg-slate-50"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete subject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <SubjectFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onRefresh?.() }}
        subject={subject}
      />

      <DeleteSubjectDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onSuccess={handleDeleteSuccess}
        subjectId={subject._id}
        subjectName={subject.name}
      />
    </>
  )
}
