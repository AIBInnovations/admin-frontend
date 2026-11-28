/** "" -> undefined, "12" -> 12 */
export const toNumber = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v))

export const isUrl = (v: string): boolean => {
  try { return /^https?:$/.test(new URL(v).protocol) } catch { return false }
}

export const isWhole = (v: string): boolean => v.trim() === '' || (/^\d+$/.test(v.trim()) && Number(v) >= 0)

export const ORDER_ERROR = 'Use a whole number, 0 or more.'

/** Pick only the edited keys into the API's shape. */
export function payload<T extends object>(changed: Partial<T>, map: { [K in keyof T]?: (v: T[K]) => unknown }): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(changed) as (keyof T)[]) {
    const convert = map[key]
    out[key as string] = convert ? convert(changed[key] as T[typeof key]) : changed[key]
  }
  return out
}

export const refId = (ref: unknown): string => (ref && typeof ref === 'object' ? String((ref as { _id?: string })._id ?? '') : typeof ref === 'string' ? ref : '')

export const refName = (ref: unknown): string | null => (ref && typeof ref === 'object' ? (ref as { name?: string }).name ?? null : null)

export function idOf(result: unknown): string | null {
  const data = (result as { data?: { _id?: string; video_id?: string } } | null)?.data
  return data?._id ?? data?.video_id ?? null
}
