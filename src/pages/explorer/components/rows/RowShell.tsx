import type { HTMLAttributes, ReactNode } from 'react'
import { ChevronRight, GripVertical, MoreHorizontal, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useCompact } from '../../context/CompactContext'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import type { PanelEntityKind } from '../../panel/panelTypes'
import { FolderLink } from '../FolderLink'

export interface RowExtras {
  selected?: boolean
  onSelect?: (id: string) => void
  dragHandleProps?: HTMLAttributes<HTMLElement>
  isDragging?: boolean
}

interface RowShellProps extends RowExtras {
  kind: PanelEntityKind
  id: string
  name: string
  leading: ReactNode
  /** Facts under the name, in order. Empty ones are skipped. */
  meta: ReactNode[]
  badges?: ReactNode
  /** The folder this row opens. Rows without one only open in the editor. */
  href?: string
  openLabel?: string
  menu?: ReactNode
  canEdit?: boolean
}

/**
 * One line of the contents list. Click shows it in the editor; double-click or
 * the arrow opens it. On a phone, where the editor is a sheet, a tap opens the
 * folder and "Edit" is in the menu.
 */
export function RowShell({ kind, id, name, leading, meta, badges, href, openLabel = 'Open', menu, canEdit, selected, onSelect, dragHandleProps, isDragging }: RowShellProps) {
  const { select, isSelected, go } = usePanelSelection()
  const compact = useCompact()
  const open = isSelected(kind, id)
  const show = () => select(kind, id)
  const primary = compact && href ? () => go(href) : show
  const facts = meta.filter((m) => m !== null && m !== undefined && m !== false && m !== '')

  return (
    <div
      onClick={(e) => { if (!(e.target as HTMLElement).closest('a,button,input,[role="menu"],[data-no-row-click]')) primary() }}
      onDoubleClick={(e) => { if (href && !(e.target as HTMLElement).closest('input,[data-no-row-click]')) go(href) }}
      className={cn(
        'group relative mx-2 my-0.5 flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors pointer-coarse:gap-3',
        selected ? 'bg-accent' : 'hover:bg-muted/70',
        open && 'bg-accent ring-1 ring-inset ring-primary/35',
        isDragging && 'bg-card opacity-90 shadow-raised',
      )}
    >
      {open && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-full" style={{ backgroundImage: 'var(--brand-gradient-v)' }} />}
      {dragHandleProps && (
        <span
          {...dragHandleProps}
          data-no-row-click
          aria-label={`Reorder ${name}`}
          className="-ml-1 flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded pointer-coarse:-ml-2 pointer-coarse:h-10 pointer-coarse:w-10 text-muted-foreground/60 transition-colors hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical aria-hidden="true" className="h-4 w-4" />
        </span>
      )}
      {onSelect && (
        <label data-no-row-click className="-m-1.5 flex shrink-0 cursor-pointer p-1.5 pointer-coarse:-m-3 pointer-coarse:p-3">
          <input type="checkbox" aria-label={`Select ${name}`} checked={selected ?? false} onChange={() => onSelect(id)} className="h-4 w-4 cursor-pointer accent-primary" />
        </label>
      )}
      {leading}

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={primary}
          aria-current={open || undefined}
          title={name}
          className="block max-w-full truncate rounded text-left text-sm font-medium text-foreground pointer-coarse:-my-2.5"
        >
          {name}
        </button>
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs tabular-nums text-muted-foreground">
          {facts.map((f, i) => <span key={i} className="max-w-full truncate">{f}{i < facts.length - 1 && <span aria-hidden="true" className="ml-1.5">·</span>}</span>)}
        </div>
        {badges && <div className="mt-1 flex flex-wrap gap-1 @lg:hidden">{badges}</div>}
      </div>

      {badges && <div className="hidden max-w-[46%] shrink-0 flex-wrap items-center justify-end gap-1.5 @lg:flex">{badges}</div>}

      <div className="flex shrink-0 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${name}`} className="h-8 w-8 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={show}><Pencil className="mr-2 h-3.5 w-3.5" /> {canEdit === false ? 'View details' : 'Edit'}</DropdownMenuItem>
            {href && <DropdownMenuItem onSelect={() => go(href)}><ChevronRight className="mr-2 h-3.5 w-3.5" /> {openLabel}</DropdownMenuItem>}
            {menu}
          </DropdownMenuContent>
        </DropdownMenu>
        {href && (
          <FolderLink href={href} aria-label={`${openLabel} ${name}`} title={openLabel} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground pointer-coarse:h-10 pointer-coarse:w-10">
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </FolderLink>
        )}
      </div>
    </div>
  )
}
