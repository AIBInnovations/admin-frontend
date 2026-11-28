import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { usePanelSelection } from '../context/PanelSelectionContext'
import { explain } from '../access'

export type FormValue = string | boolean | string[]
export type FormErrors<T> = Partial<Record<keyof T, string>>

interface Options<T extends Record<string, FormValue>> {
  /** Prefix for field ids. */
  id: string
  /** Names the thing in messages: "package", "video". */
  what: string
  /** Shown in the "Save or discard" question. */
  label: (v: T) => string
  initial: () => T
  validate?: (v: T) => FormErrors<T>
  /** `changed` holds only the fields the admin edited. */
  submit: (v: T, changed: Partial<T>) => Promise<unknown>
  /** Runs after a save, before the form counts as done (refresh, select the new item). */
  onSaved?: (result: unknown) => Promise<void> | void
  savedMessage: (v: T) => string
  readOnly?: boolean
}

export interface EntityForm<T extends Record<string, FormValue>> {
  id: string
  values: T
  set: <K extends keyof T>(key: K, value: T[K]) => void
  errors: FormErrors<T>
  error: string | null
  dirty: boolean
  saving: boolean
  readOnly: boolean
  save: () => Promise<boolean>
  reset: () => void
}

/** The part of a form its chrome needs, whatever its fields are. */
export type FormState = Pick<EntityForm<Record<string, FormValue>>, 'error' | 'dirty' | 'saving' | 'readOnly' | 'save' | 'reset'>

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * A docked form. Mount one per entity (key by id).
 *
 * When the entity is refreshed behind the form (a reorder, a publish, another
 * admin), fields the admin has not touched follow the server and fields being
 * edited are left alone. A save sends only what was edited, so it never puts
 * back an old value of something else. A failed save keeps everything typed.
 */
export function useEntityForm<T extends Record<string, FormValue>>(options: Options<T>): EntityForm<T> {
  const opts = useRef(options)
  opts.current = options
  const fresh = options.initial()
  const freshJson = JSON.stringify(fresh)
  const [state, setState] = useState(() => ({ baseline: fresh, values: fresh }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const busy = useRef(false)
  const lastFresh = useRef(freshJson)

  useEffect(() => {
    if (lastFresh.current === freshJson) return
    lastFresh.current = freshJson
    const next = JSON.parse(freshJson) as T
    setState((s) => {
      const values = { ...next }
      for (const key of Object.keys(next) as (keyof T)[]) {
        if (!same(s.values[key], s.baseline[key])) values[key] = s.values[key]
      }
      return { baseline: next, values }
    })
  }, [freshJson])

  const { values, baseline } = state
  const readOnly = !!options.readOnly
  const dirty = !readOnly && !same(values, baseline)
  const allErrors = useMemo(() => opts.current.validate?.(values) ?? {}, [values])

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setError(null)
    setState((s) => ({ ...s, values: { ...s.values, [key]: value } }))
  }, [])

  const reset = useCallback(() => {
    setError(null)
    setShowErrors(false)
    setState((s) => ({ ...s, values: s.baseline }))
  }, [])

  const save = useCallback(async (): Promise<boolean> => {
    if (busy.current) return false
    const o = opts.current
    const errs: FormErrors<T> = o.validate?.(values) ?? {}
    const first = Object.keys(errs).find((k) => errs[k as keyof T])
    if (first) {
      setShowErrors(true)
      requestAnimationFrame(() => document.getElementById(`${o.id}-${first}`)?.focus())
      return false
    }
    const changed: Partial<T> = {}
    for (const key of Object.keys(values) as (keyof T)[]) if (!same(values[key], baseline[key])) changed[key] = values[key]
    busy.current = true
    setSaving(true)
    setError(null)
    try {
      const result = await o.submit(values, changed)
      setState((s) => ({ ...s, baseline: values }))
      setShowErrors(false)
      toast.success(o.savedMessage(values))
      await o.onSaved?.(result)
      return true
    } catch (err) {
      setError(explain(err, `this ${o.what}`))
      return false
    } finally {
      busy.current = false
      setSaving(false)
    }
  }, [values, baseline])

  const { register } = usePanelSelection()
  const label = options.label(values)
  useEffect(() => {
    register({ label, dirty, saving, save, reset })
  }, [register, label, dirty, saving, save, reset])
  useEffect(() => () => register(null), [register])

  return { id: options.id, values, set, errors: showErrors ? allErrors : {}, error, dirty, saving, readOnly, save, reset }
}
