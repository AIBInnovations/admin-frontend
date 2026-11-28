import { useCallback, useEffect, useState } from 'react'
import { KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { explain } from '../access'

/**
 * Drag to reorder. The new order shows at once; when the refreshed list
 * arrives it takes over, so items added or removed later still appear.
 */
export function useReorder<T extends { _id: string }>(items: T[], save: (ids: string[]) => Promise<unknown>, refresh: () => Promise<void> | void, what: string) {
  const [order, setOrder] = useState<string[] | null>(null)
  useEffect(() => { setOrder(null) }, [items])

  const ordered = order ? [...items].sort((a, b) => order.indexOf(a._id) - order.indexOf(b._id)) : items

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = useCallback(async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = ordered.map((i) => i._id)
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
    setOrder(next)
    try {
      await save(next)
      toast.success('Order updated')
      await refresh()
    } catch (err) {
      setOrder(null)
      toast.error('The new order was not saved', { description: explain(err, `the order of ${what}`) })
    }
  }, [ordered, save, refresh, what])

  return { ordered, sensors, onDragEnd }
}
