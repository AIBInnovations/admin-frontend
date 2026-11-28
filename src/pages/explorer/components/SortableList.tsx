import type { ReactNode } from 'react'
import { DndContext, closestCenter, type DragEndEvent, type SensorDescriptor, type SensorOptions } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem, type SortableRenderProps } from './SortableItem'

interface SortableListProps<T extends { _id: string }> {
  items: T[]
  label: string
  sensors: SensorDescriptor<SensorOptions>[]
  onDragEnd: (e: DragEndEvent) => void
  /** No permission to reorder, or the list is filtered. */
  disabled?: boolean
  render: (item: T, props: SortableRenderProps) => ReactNode
}

export function SortableList<T extends { _id: string }>({ items, label, sensors, onDragEnd, disabled, render }: SortableListProps<T>) {
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i._id)} strategy={verticalListSortingStrategy}>
        <ul aria-label={label} className="py-1.5">
          {items.map((item) => <SortableItem key={item._id} id={item._id} disabled={disabled}>{(props) => render(item, props)}</SortableItem>)}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
