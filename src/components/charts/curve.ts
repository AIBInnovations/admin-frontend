/**
 * Line and area paths for the charts.
 *
 * `smooth` is a monotone cubic (Steffen's method, the same family as
 * Fritsch-Carlson): each segment stays between its two points, so a curve
 * never overshoots a peak or dips below zero between two real values.
 * `linear` keeps straight segments for data where a curve would suggest
 * values that were never there.
 *
 * Points are in screen space. A null value is a gap: the line lifts and the
 * area closes, and the next value starts a new run.
 */
export type Curve = 'smooth' | 'linear'
export type Pt = [number, number]

const f = (n: number) => (Math.round(n * 10) / 10).toString()

/** Runs of consecutive points between gaps. */
export function runs(values: (number | null | undefined)[], x: (i: number) => number, y: (v: number) => number): Pt[][] {
  const out: Pt[][] = []
  let cur: Pt[] = []
  values.forEach((v, i) => {
    if (v === null || v === undefined || Number.isNaN(v)) { if (cur.length) out.push(cur); cur = []; return }
    cur.push([x(i), y(v)])
  })
  if (cur.length) out.push(cur)
  return out
}

const sign = (n: number) => (n < 0 ? -1 : 1)

/** Tangents for a monotone cubic through the points. */
function tangents(p: Pt[]): number[] {
  const n = p.length
  const m = new Array<number>(n).fill(0)
  if (n < 2) return m
  const h: number[] = []
  const d: number[] = []
  for (let k = 0; k < n - 1; k += 1) {
    h.push(p[k + 1][0] - p[k][0])
    d.push(h[k] ? (p[k + 1][1] - p[k][1]) / h[k] : 0)
  }
  for (let k = 1; k < n - 1; k += 1) {
    const s0 = d[k - 1]
    const s1 = d[k]
    const q = (s0 * h[k] + s1 * h[k - 1]) / (h[k - 1] + h[k] || 1)
    m[k] = (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(q)) || 0
  }
  // One-sided ends, kept between 0.5x and 1.5x of the end secant: still monotone
  m[0] = n > 2 ? (3 * d[0] - m[1]) / 2 : d[0]
  m[n - 1] = n > 2 ? (3 * d[n - 2] - m[n - 2]) / 2 : d[n - 2]
  if (sign(m[0]) !== sign(d[0]) || !d[0]) m[0] = 0
  if (sign(m[n - 1]) !== sign(d[n - 2]) || !d[n - 2]) m[n - 1] = 0
  return m
}

/** The path of one run: "M x,y C ...". A run of one point is just a move. */
export function runPath(p: Pt[], curve: Curve = 'smooth'): string {
  if (!p.length) return ''
  let d = `M${f(p[0][0])},${f(p[0][1])}`
  if (p.length === 1) return d
  if (curve === 'linear' || p.length === 2) {
    for (let k = 1; k < p.length; k += 1) d += `L${f(p[k][0])},${f(p[k][1])}`
    return d
  }
  const m = tangents(p)
  for (let k = 0; k < p.length - 1; k += 1) {
    const [x0, y0] = p[k]
    const [x1, y1] = p[k + 1]
    const dx = (x1 - x0) / 3
    d += `C${f(x0 + dx)},${f(y0 + dx * m[k])} ${f(x1 - dx)},${f(y1 - dx * m[k + 1])} ${f(x1)},${f(y1)}`
  }
  return d
}

/** Every run of a series, as one path with a move between runs. */
export function linePath(values: (number | null | undefined)[], x: (i: number) => number, y: (v: number) => number, curve: Curve = 'smooth'): string {
  return runs(values, x, y).map((r) => runPath(r, curve)).join('')
}

/** The wash under a line: each run closed down to the baseline, so a gap stays empty. */
export function areaPath(values: (number | null | undefined)[], x: (i: number) => number, y: (v: number) => number, base: number, curve: Curve = 'smooth'): string {
  return runs(values, x, y)
    .filter((r) => r.length > 1)
    .map((r) => `${runPath(r, curve)}L${f(r[r.length - 1][0])},${f(base)}L${f(r[0][0])},${f(base)}Z`)
    .join('')
}

/** A likely range: the high edge forward, the low edge back, each smoothed. */
export function bandPath(low: (number | null)[], high: (number | null)[], x: (i: number) => number, y: (v: number) => number, curve: Curve = 'smooth'): string {
  const idx = high.map((v, i) => (v === null || low[i] === null || v === undefined || low[i] === undefined ? -1 : i)).filter((i) => i >= 0)
  if (idx.length < 2) return ''
  const up: Pt[] = idx.map((i) => [x(i), y(high[i] as number)])
  const down: Pt[] = [...idx].reverse().map((i) => [x(i), y(low[i] as number)])
  const back = runPath(down, curve).replace(/^M/, 'L')
  return `${runPath(up, curve)}${back}Z`
}
