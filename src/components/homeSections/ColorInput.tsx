import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { TextInput } from '@/components/forms/editor/fields'

export const HEX = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/
export const hexProblem = (v: string) => (v && !HEX.test(v) ? 'Invalid hex (e.g. #FF0000)' : undefined)

type Props = React.ComponentProps<'input'> & { swatch: string; onPick: (hex: string) => void }

/** A hex code with a swatch that opens the browser's colour picker. */
export const ColorInput = forwardRef<HTMLInputElement, Props>(({ swatch, onPick, disabled, className, ...props }, ref) => {
  const valid = HEX.test(swatch)
  return (
    <div className="flex items-center gap-2">
      <TextInput ref={ref} disabled={disabled} spellCheck={false} className={cn('font-mono uppercase placeholder:normal-case', className)} {...props} />
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-input bg-muted" style={valid ? { backgroundColor: swatch } : undefined}>
        <input
          type="color"
          aria-label="Pick a colour"
          disabled={disabled}
          value={valid ? swatch.slice(0, 7).toLowerCase() : '#ffffff'}
          onChange={(e) => onPick(e.target.value.toUpperCase())}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </span>
    </div>
  )
})
ColorInput.displayName = 'ColorInput'
