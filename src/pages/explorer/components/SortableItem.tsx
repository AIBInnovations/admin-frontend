import type { HTMLAttributes, ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface SortableRenderProps {
  dragHandleProps?: HTMLAttributes<HTMLElement>
  isDragging: boolean
}

interface SortableItemProps {
  id: string
  disabled?: boolean
  children: (props: SortableRenderProps) => ReactNode
}

export function SortableItem({ id, disabled, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={isDragging ? 'relative z-10' : undefined}>
      {children({ dragHandleProps: disabled ? undefined : { ...attributes, ...listeners }, isDragging })}
    </li>
  )
}
