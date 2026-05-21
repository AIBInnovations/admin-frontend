import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronRight, MoreHorizontal, Pencil, Package, Copy, Trash2, Braces } from 'lucide-react'
import { ActiveBadge } from '../../ui/StatusBadge'
import { DeleteSubjectDialog } from '../../dialogs/DeleteSubjectDialog'
import { RawJsonDrawer } from '../popovers/RawJsonDrawer'
import { buildChildUrl, type ExplorerFocus } from '../../parseExplorerPath'
import { copyText } from '../../copyShareLink'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import { entityId } from '../../panel/panelTypes'
import type { Subject } from '@/services/subjects.service'

interface SubjectRowProps {
  subject: Subject
  parentFocus: ExplorerFocus
  onEdit?: (subject: Subject) => void
  onRefresh?: () => void
}

export function SubjectRow({ subject, parentFocus, onRefresh }: SubjectRowProps) {
  const navigate = useNavigate()
  const { select, target } = usePanelSelection()
  const drillUrl = buildChildUrl(parentFocus, subject._id)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [rawJsonOpen, setRawJsonOpen] = useState(false)

  const isOpen = entityId(target?.entity) === subject._id
  const openInPanel = () => select({ kind: 'subject', entity: subject })

  return (
    <>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-xl transition-colors cursor-pointer group ${isOpen ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}
        onClick={openInPanel}
      >
        <Avatar className="w-9 h-9 rounded-lg shrink-0">
          {subject.icon_url && <AvatarImage src={subject.icon_url} alt={subject.name} />}
          <AvatarFallback className="rounded-lg bg-indigo-100 text-indigo-700 text-xs font-semibold">
            {subject.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{subject.name}</p>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <Package className="w-3 h-3" />
            {subject.package_count ?? 0} packages
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ActiveBadge active={subject.is_active} />
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={openInPanel}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyText(subject._id, 'Subject ID')}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Copy ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRawJsonOpen(true)}>
                <Braces className="w-3.5 h-3.5 mr-2" /> View raw JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-300 hover:text-slate-600 hover:bg-slate-100"
            title="Open"
            onClick={() => navigate(drillUrl)}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <DeleteSubjectDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onSuccess={() => { setDeleteOpen(false); onRefresh?.() }}
        subjectId={subject._id}
        subjectName={subject.name}
      />
      <RawJsonDrawer
        open={rawJsonOpen}
        onClose={() => setRawJsonOpen(false)}
        label={subject.name}
        data={subject}
      />
    </>
  )
}
