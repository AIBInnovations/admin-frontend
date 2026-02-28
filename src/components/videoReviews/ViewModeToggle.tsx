import { Button } from '@/components/ui/button'
import { List, Video as VideoIcon, User } from 'lucide-react'

export type ViewMode = 'list' | 'by-video' | 'by-teacher'

interface ViewModeToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  const modes: { key: ViewMode; label: string; Icon: React.ElementType }[] = [
    { key: 'list', label: 'List', Icon: List },
    { key: 'by-video', label: 'By Video', Icon: VideoIcon },
    { key: 'by-teacher', label: 'By Teacher', Icon: User },
  ]

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
      {modes.map(({ key, label, Icon }) => (
        <Button
          key={key}
          size="sm"
          variant={value === key ? 'secondary' : 'ghost'}
          className="h-7 px-3 text-xs gap-1.5"
          onClick={() => onChange(key)}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Button>
      ))}
    </div>
  )
}
