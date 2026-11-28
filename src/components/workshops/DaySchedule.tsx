import { useRef, useState } from 'react'
import { Controller, useFieldArray, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from 'react-hook-form'
import { AlertTriangle, ArrowDown, ArrowUp, CalendarDays, Copy, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { StatusPill } from '@/components/common/detail'
import { Field, Note, TextInput } from '@/components/forms/editor/fields'
import { RefPicker, type OptionList } from '@/components/forms/editor/pickers'
import { RunStatus } from '@/components/forms/editor/list'
import { istSpan, istWeekday, fromIstInputs, minutesLabel, shiftDate } from '@/components/forms/editor/ist'
import { MAX_DAYS, dayEnd, dayMinutes, dayNumbers, dayStart, emptyDay, type DayValues, type WorkshopFormValues } from './workshopForm'

interface DayScheduleProps {
  control: Control<WorkshopFormValues>
  register: UseFormRegister<WorkshopFormValues>
  setValue: UseFormSetValue<WorkshopFormValues>
  errors: FieldErrors<WorkshopFormValues>
  days: DayValues[]
  faculty: OptionList
  disabled?: boolean
}

/** The day-by-day editor: one card per day, in any order; Day numbers follow the dates. */
export function DaySchedule({ control, register, setValue, errors, days, faculty, disabled }: DayScheduleProps) {
  const { fields, append, insert, remove, swap } = useFieldArray({ control, name: 'days' })
  const [said, setSaid] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const numbers = dayNumbers(days)
  const total = days.reduce((sum, d) => sum + dayMinutes(d), 0)
  const full = fields.length >= MAX_DAYS
  const anySaved = days.some((d) => d.session_id)

  const focusDay = (index: number) => setTimeout(() => root.current?.querySelector<HTMLInputElement>(`#day-${index}-title`)?.focus(), 0)

  const add = () => { append(emptyDay()); setSaid(`Day added. ${fields.length + 1} days.`); focusDay(fields.length) }

  const duplicate = (i: number) => {
    const d = days[i]
    insert(i + 1, { ...d, session_id: null, locked: false, status: null, date: d.date ? shiftDate(d.date, 1) : '' })
    setSaid(`Day copied. ${fields.length + 1} days.`)
    focusDay(i + 1)
  }

  // Moving a day gives it the other day's slot, so the numbers follow the move.
  const move = (i: number, j: number) => {
    const a = days[i]
    const b = days[j]
    swap(i, j)
    if (a.date && b.date) {
      const slot = (d: DayValues) => ({ date: d.date, start_time: d.start_time, end_time: d.end_time, ends_next_day: d.ends_next_day })
      setValue(`days.${i}`, { ...b, ...slot(a) }, { shouldDirty: true })
      setValue(`days.${j}`, { ...a, ...slot(b) }, { shouldDirty: true })
    }
    setSaid(`${a.title || 'Day'} moved ${j < i ? 'up' : 'down'}.`)
    setTimeout(() => root.current?.querySelector<HTMLButtonElement>(`[data-move="${j}-${j < i ? 'up' : 'down'}"]:not(:disabled), [data-move="${j}-${j < i ? 'down' : 'up'}"]`)?.focus(), 0)
  }

  const listError = (errors.days as { message?: string; root?: { message?: string } } | undefined)?.root?.message ?? (errors.days as { message?: string } | undefined)?.message

  return (
    <div ref={root} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground" aria-live="polite">
          <span className="font-medium tabular-nums text-foreground">{fields.length} day{fields.length === 1 ? '' : 's'}{total > 0 ? `, ${minutesLabel(total)} in all` : ''}</span>
          {full ? `. A workshop can have at most ${MAX_DAYS} days.` : ''}
          <span className="sr-only">{said}</span>
        </p>
        <Button type="button" variant="outline" size="sm" className="bg-card" onClick={add} disabled={disabled || full}><Plus aria-hidden="true" />Add day</Button>
      </div>

      {listError && <p className="text-[13px] text-danger" aria-invalid="true" tabIndex={-1}>{listError}</p>}

      {fields.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-input px-4 py-8 text-center">
          <CalendarDays aria-hidden="true" className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No days yet. A workshop needs at least one day.</p>
          <Button type="button" variant="outline" size="sm" className="bg-card" onClick={add} disabled={disabled}><Plus aria-hidden="true" />Add day</Button>
        </div>
      )}

      <ol className="space-y-4">
        {fields.map((field, i) => {
          const day = days[i] ?? emptyDay()
          const err = errors.days?.[i]
          const start = dayStart(day)
          const end = dayEnd(day)
          const minutes = dayMinutes(day)
          const backwards = !!start && !!end && end <= start && !day.ends_next_day
          const past = !!end && end.getTime() < Date.now()
          const lockedNear = (j: number) => day.locked || !!days[j]?.locked
          return (
            <li key={field.id} className="rounded-md border border-border bg-background p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">Day {numbers[i] ?? i + 1}</h3>
                  {day.status && day.status !== 'scheduled' && <RunStatus status={day.status} />}
                  {!day.session_id && anySaved && <StatusPill>New</StatusPill>}
                  {day.locked && (
                    <span className="flex items-center gap-1 text-xs text-warning"><AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />Has attendance or recordings</span>
                  )}
                </div>
                <div className="flex gap-0.5">
                  <IconButton data-move={`${i}-up`} label={`Move day ${numbers[i]} earlier`} title={lockedNear(i - 1) ? 'A day with attendance or recordings keeps its date' : 'Swap dates with the day above'} disabled={disabled || i === 0 || lockedNear(i - 1)} onClick={() => move(i, i - 1)}><ArrowUp /></IconButton>
                  <IconButton data-move={`${i}-down`} label={`Move day ${numbers[i]} later`} title={lockedNear(i + 1) ? 'A day with attendance or recordings keeps its date' : 'Swap dates with the day below'} disabled={disabled || i === fields.length - 1 || lockedNear(i + 1)} onClick={() => move(i, i + 1)}><ArrowDown /></IconButton>
                  <IconButton label={`Duplicate day ${numbers[i]}`} title="Duplicate day" disabled={disabled || full} onClick={() => duplicate(i)}><Copy /></IconButton>
                  <IconButton
                    label={`Remove day ${numbers[i]}`}
                    title={day.locked ? 'This day has history. Cancel it from the workshop page instead' : fields.length <= 1 ? 'A workshop needs at least one day' : 'Remove day'}
                    disabled={disabled || fields.length <= 1 || day.locked}
                    onClick={() => { remove(i); setSaid(`Day removed. ${fields.length - 1} days.`) }}
                  ><Trash2 /></IconButton>
                </div>
              </div>

              <div className="space-y-4">
                <Field id={`day-${i}-title`} label="Day title" required error={err?.title?.message}>
                  {(c) => <TextInput {...c} placeholder="Day title, e.g. Fundamentals & Port Placement" disabled={disabled} {...register(`days.${i}.title` as const)} />}
                </Field>
                <Field id={`day-${i}-description`} label="Day description" error={err?.description?.message}>
                  {(c) => <Textarea {...c} rows={2} placeholder="What this day covers (optional)" disabled={disabled} className="bg-card aria-invalid:border-danger" {...register(`days.${i}.description` as const)} />}
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field id={`day-${i}-date`} label="Date" required error={err?.date?.message} hint={start ? istWeekday(start) : undefined}>
                    {(c) => <TextInput {...c} type="date" disabled={disabled} {...register(`days.${i}.date` as const)} />}
                  </Field>
                  <Field id={`day-${i}-start`} label="Start" required error={err?.start_time?.message}>
                    {(c) => <TextInput {...c} type="time" disabled={disabled} {...register(`days.${i}.start_time` as const)} />}
                  </Field>
                  <Field id={`day-${i}-end`} label="End" required error={err?.end_time?.message} hint={minutes > 0 ? minutesLabel(minutes) : undefined}>
                    {(c) => <TextInput {...c} type="time" disabled={disabled} {...register(`days.${i}.end_time` as const)} />}
                  </Field>
                </div>
                {(backwards || day.ends_next_day) && (
                  <Controller control={control} name={`days.${i}.ends_next_day` as const} render={({ field: f }) => (
                    <label className="flex items-start gap-2.5 text-[13px]">
                      <Checkbox className="mt-0.5" checked={f.value} onCheckedChange={(x) => f.onChange(x === true)} disabled={disabled} />
                      <span>Ends after midnight{day.date ? `, on ${istWeekday(fromIstInputs(shiftDate(day.date, 1), '12:00'))}` : ''}</span>
                    </label>
                  )} />
                )}
                {minutes > 12 * 60 && <Note tone="warning">This day runs for {minutesLabel(minutes)}. Check the times.</Note>}
                {past && !day.session_id && <Note tone="warning">This date has already passed ({istSpan(start, end)}).</Note>}
                <Field id={`day-${i}-faculty`} label="Faculty for this day">
                  {(c) => (
                    <Controller name={`days.${i}.faculty_id` as const} control={control} render={({ field: f }) => (
                      <RefPicker control={c} value={f.value} onChange={f.onChange} list={faculty} noneLabel="No faculty" emptyText="No faculty found." missingLabel="Deleted faculty" disabled={disabled} />
                    )} />
                  )}
                </Field>
              </div>
            </li>
          )
        })}
      </ol>
      {fields.length > 2 && !full && (
        <Button type="button" variant="outline" size="sm" className="bg-card" onClick={add} disabled={disabled}><Plus aria-hidden="true" />Add day</Button>
      )}
    </div>
  )
}

function IconButton({ label, title, children, ...props }: React.ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:h-4 [&_svg]:w-4"
      {...props}
    >
      {children}
    </button>
  )
}
