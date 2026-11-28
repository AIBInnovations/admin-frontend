import type { ReactNode } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SortableListProps<T> {
  items: T[]
  idOf: (item: T) => string
  nameOf: (item: T) => string
  onReorder: (items: T[]) => void
  disabled?: boolean
  children: (item: T, index: number) => ReactNode
}

/** Drag by the handle, or focus it and use Space then the arrow keys. */
export function SortableList<T>({ items, idOf, nameOf, onReorder, disabled, children }: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = items.map(idOf)
  const name = (id: string | number) => { const it = items.find((x) => idOf(x) === id); return it ? nameOf(it) : '' }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from >= 0 && to >= 0) onReorder(arrayMove(items, from, to))
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: 'Press Space to pick up, the up and down arrows to move, Space to drop, Escape to cancel.' },
        announcements: {
          onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
          onDragOver: ({ active, over }) => (over ? `${name(active.id)} is at position ${ids.indexOf(String(over.id)) + 1} of ${ids.length}.` : undefined),
          onDragEnd: ({ active, over }) => (over ? `${name(active.id)} dropped at position ${ids.indexOf(String(over.id)) + 1} of ${ids.length}.` : `${name(active.id)} dropped.`),
          onDragCancel: ({ active }) => `${name(active.id)} was put back.`,
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <Row key={idOf(item)} id={idOf(item)} name={nameOf(item)} disabled={disabled}>{children(item, i)}</Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function Row({ id, name, disabled, children }: { id: string; name: string; disabled?: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5', isDragging && 'relative z-10 border-primary shadow-raised')}
    >
      <button
        type="button"
        aria-label={`Reorder ${name}`}
        disabled={disabled}
        className="flex h-8 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  )
}
