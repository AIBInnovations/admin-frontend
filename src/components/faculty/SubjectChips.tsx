import { cn } from '@/lib/utils'
import type { FacultySubject } from '@/services/faculty.service'

/** Subjects of a lecturer, primary first. Shows `max` and says how many more. */
export function SubjectChips({ subjects, max = subjects.length, className }: { subjects: FacultySubject[]; max?: number; className?: string }) {
  const shown = subjects.slice(0, max)
  const rest = subjects.slice(max)
  return (
    <ul className={cn('flex flex-wrap gap-1', className)}>
      {shown.map((s, i) => (
        <li key={s._id} title={i === 0 && subjects.length > 1 ? `${s.name} (primary)` : s.name} className={cn('max-w-[180px] truncate rounded-full px-2 py-0.5 text-xs font-medium', i === 0 ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground')}>
          {s.name}
        </li>
      ))}
      {rest.length > 0 && <li title={rest.map((s) => s.name).join(', ')} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">+{rest.length} more</li>}
    </ul>
  )
}
