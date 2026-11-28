/**
 * Trailing averages for daily series, computed on the page (the backend sends
 * the plain daily numbers).
 *
 * The average for a day is the mean of that day and the six before it. Days
 * before the range come from `before` (the period just before it, when the
 * two are back to back); without them the first days have no average (null)
 * rather than an average of fewer days that would read as a 7-day one. A
 * missing day inside the window also gives null.
 */
export function trailingAverage(values: (number | null | undefined)[], window = 7, before: (number | null | undefined)[] = []): (number | null)[] {
  return values.map((_, i) => {
    let sum = 0
    for (let k = i - window + 1; k <= i; k += 1) {
      const v = k >= 0 ? values[k] : before[before.length + k]
      if (v === null || v === undefined || Number.isNaN(v)) return null
      sum += v
    }
    return sum / window
  })
}

/** The same series with one bucket blanked (today, still in progress): lines stop at the last complete day. */
export function withoutBucket<T>(values: (T | null)[], index: number | null): (T | null)[] {
  if (index === null || index < 0 || index >= values.length) return values
  return values.map((v, i) => (i === index ? null : v))
}
