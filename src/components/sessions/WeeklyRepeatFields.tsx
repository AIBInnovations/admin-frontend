import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Field, Note, TextInput, UnitInput } from '@/components/forms/editor/fields'
import {
  DAY_NAMES, DAY_SHORT, WEEK_ORDER, clock, currentOrNext, listClasses, overtimeLabel, parseTime, previewText, scheduleLabel, shortDate,
  type SessionRepeat,
} from './weeklySchedule'

export interface RepeatValues {
  days: number[]
  start_time: string
  end_time: string
  overtime_minutes: number | null
  starts_on: string
  ends_on: string
}

export type RepeatErrors = Partial<Record<keyof RepeatValues, string>>

interface Props {
  value: RepeatValues
  onChange: (patch: Partial<RepeatValues>) => void
  errors: RepeatErrors
  disabled?: boolean
}

export const asRepeat = (v: RepeatValues): SessionRepeat => ({
  weekly: true,
  days: [...v.days].sort((a, b) => a - b),
  start_time: v.start_time,
  end_time: v.end_time,
  overtime_minutes: v.overtime_minutes ?? 0,
  starts_on: v.starts_on,
  ends_on: v.ends_on,
})

/**
 * "Repeats weekly": weekday chips, the class time and overtime (IST), the
 * first and last date, and a live preview of the classes it makes.
 */
export function WeeklyRepeatFields({ value, onChange, errors, disabled }: Props) {
  const repeat = asRepeat(value)
  const classes = listClasses(repeat)
  const preview = previewText(repeat)
  const label = scheduleLabel(repeat)
  const overtime = overtimeLabel(repeat)
  const now = Date.now()
  const next = currentOrNext(repeat, now)
  const upcoming = classes.filter((c) => c.closes.getTime() > now).slice(0, 4)
  const past = classes.length - classes.filter((c) => c.closes.getTime() > now).length
  const s = parseTime(value.start_time)
  const e = parseTime(value.end_time)
  const nextDay = s !== null && e !== null && e < s

  const toggle = (d: number) => onChange({ days: value.days.includes(d) ? value.days.filter((x) => x !== d) : [...value.days, d] })

  return (
    <div className="space-y-4">
      <div className="min-w-0 space-y-1.5">
        <p id="repeat_days-label" className="text-[13px] font-medium leading-snug">
          Days<span className="text-danger" aria-hidden="true"> *</span><span className="sr-only"> (required)</span>
        </p>
        <div
          role="group"
          aria-labelledby="repeat_days-label"
          aria-describedby={errors.days ? 'repeat_days-error' : undefined}
          className="flex flex-wrap gap-1.5"
          id="repeat_days"
          tabIndex={-1}
          aria-invalid={errors.days ? true : undefined}
        >
          {WEEK_ORDER.map((d) => {
            const on = value.days.includes(d)
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                aria-label={DAY_NAMES[d]}
                disabled={disabled}
                onClick={() => toggle(d)}
                className={cn(
                  'h-9 min-w-[3.25rem] rounded-md border px-3 text-[13px] font-medium transition-colors duration-150',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-60',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-accent',
                )}
              >
                {DAY_SHORT[d]}
              </button>
            )
          })}
        </div>
        {errors.days && <p id="repeat_days-error" className="text-[13px] text-danger">{errors.days}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="repeat_start_time" label="Class starts (IST)" required error={errors.start_time}>
          {(c) => <TextInput {...c} type="time" value={value.start_time} disabled={disabled} onChange={(ev) => onChange({ start_time: ev.target.value })} />}
        </Field>
        <Field id="repeat_end_time" label="Class ends (IST)" required error={errors.end_time} hint={nextDay && !errors.end_time ? 'Ends the next day' : undefined}>
          {(c) => <TextInput {...c} type="time" value={value.end_time} disabled={disabled} onChange={(ev) => onChange({ end_time: ev.target.value })} />}
        </Field>
        <Field
          id="repeat_overtime"
          label="Overtime allowed"
          error={errors.overtime_minutes}
          hint={!errors.overtime_minutes ? 'Students can still join this long after the end time.' : undefined}
        >
          {(c) => (
            <UnitInput
              {...c}
              suffix="minutes"
              min={0}
              max={120}
              step={5}
              inputMode="numeric"
              value={value.overtime_minutes ?? ''}
              disabled={disabled}
              onChange={(ev) => onChange({ overtime_minutes: ev.target.value === '' ? null : Number(ev.target.value) })}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="repeat_starts_on" label="First date" required error={errors.starts_on}>
          {(c) => <TextInput {...c} type="date" value={value.starts_on} disabled={disabled} onChange={(ev) => onChange({ starts_on: ev.target.value })} />}
        </Field>
        <Field id="repeat_ends_on" label="Last date" required error={errors.ends_on}>
          {(c) => <TextInput {...c} type="date" min={value.starts_on || undefined} value={value.ends_on} disabled={disabled} onChange={(ev) => onChange({ ends_on: ev.target.value })} />}
        </Field>
      </div>

      <div aria-live="polite">
        {preview ? (
          <div className="rounded-md border border-border bg-muted/40 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 space-y-1 text-[13px]">
                <p className="font-medium text-foreground">{preview}</p>
                <p className="text-muted-foreground">{label}{overtime ? `. ${overtime}.` : '.'} One registration and one Zoom meeting cover every class.</p>
                {upcoming.length > 0 ? (
                  <p className="text-muted-foreground">
                    <span className="text-foreground">{next && next.start.getTime() <= now ? 'Now and next:' : 'Next classes:'}</span>{' '}
                    {upcoming.map((c) => `${shortDate(c.start)} (${c.number} of ${classes.length})`).join(', ')}
                  </p>
                ) : (
                  <p className="text-warning">Every class in this range has already happened. Students will see the series as completed.</p>
                )}
                {past > 0 && upcoming.length > 0 && (
                  <p className="text-muted-foreground">{past === 1 ? '1 class has' : `${past} classes have`} already happened; students see the next one.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Note>Choose the days, the class time and the dates to see the classes.</Note>
        )}
      </div>
    </div>
  )
}

/** "7:00 PM to 9:00 PM" for a repeat, used in short summaries. */
export const classTimeText = (r: SessionRepeat) => {
  const s = parseTime(r.start_time); const e = parseTime(r.end_time)
  return s === null || e === null ? '' : `${clock(s)} to ${clock(e)}`
}
