import { useEffect, useState } from 'react'
import { facultyService, type Faculty } from '@/services/faculty.service'
import { useExplorerAccess } from '../access'

/** Faculty for a select. Empty when the admin may not see faculty. */
export function useFaculty(): Faculty[] {
  const { has } = useExplorerAccess()
  const allowed = has('faculty.read')
  const [list, setList] = useState<Faculty[]>([])
  useEffect(() => {
    if (!allowed) return
    let live = true
    facultyService.getAll({ page: 1, limit: 200, sort_by: 'name', sort_order: 'asc' }).then((res) => { if (live && res.data) setList(res.data.entities) }).catch(() => {})
    return () => { live = false }
  }, [allowed])
  return list
}
