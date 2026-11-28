import type { ChartPicture } from './frame'

export interface CsvTable { header: string[]; rows: (string | number | null | undefined)[][] }

/**
 * One CSV cell. Text a spreadsheet would run as a formula (=, +, -, @, tab,
 * return) gets a leading apostrophe; real numbers stay numbers. The same rule
 * as the server's exports.
 */
export function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  let s = String(v).replace(/\r\n?/g, '\n')
  if (/^[\s]*[=+\-@\t\r]/.test(s) || /^[＝＋－＠]/.test(s)) s = `'${s}`
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Safe file names: "pgme-revenue-by-subject-2026-11-01-to-2026-11-30". */
export function fileName(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'pgme-chart'
}

export function downloadCsv(name: string, table: CsvTable) {
  // BOM so Excel reads ₹ and Indian names correctly
  const text = `﻿${[table.header, ...table.rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`
  save(new Blob([text], { type: 'text/csv;charset=utf-8' }), `${name}.csv`)
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'stop-color', 'stop-opacity', 'paint-order', 'font-size', 'font-weight', 'font-family']

/** Copies the computed colours onto a clone, so it draws without the page's CSS variables. */
function inlineStyles(source: Element, target: Element) {
  const cs = getComputedStyle(source)
  for (const p of PROPS) {
    const v = cs.getPropertyValue(p)
    if (v) (target as SVGElement).style.setProperty(p, v)
  }
  // A picture is still: no draw-in, no pulse
  ;(target as SVGElement).style.setProperty('animation', 'none')
  for (let i = 0; i < source.children.length; i += 1) inlineStyles(source.children[i], target.children[i])
}

/** A colour such as var(--chart-theory) as the browser sees it now. */
export function resolveColor(css: string): string {
  const probe = document.createElement('span')
  probe.style.color = css
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const c = getComputedStyle(probe).color
  probe.remove()
  return c || css
}

const text = (x: number, y: number, s: string, size: number, color: string, weight = 400, anchor = 'start') => {
  const t = document.createElementNS(SVG_NS, 'text')
  t.setAttribute('x', String(x))
  t.setAttribute('y', String(y))
  t.setAttribute('font-size', String(size))
  t.setAttribute('font-weight', String(weight))
  t.setAttribute('fill', color)
  t.setAttribute('text-anchor', anchor)
  t.setAttribute('font-family', "'IBM Plex Sans', system-ui, sans-serif")
  t.textContent = s
  return t
}

interface PngOptions {
  name: string
  title: string
  subtitle?: string
  legend?: { name: string; color: string; shape?: 'line' | 'box' | 'dash' | 'column' }[]
  picture: ChartPicture
  /** The card, for its background and text colours. */
  card: HTMLElement
}

/** Draws the chart with its title and legend on the card's own background, at 2x, and saves it. */
export async function downloadPng({ name, title, subtitle, legend = [], picture, card }: PngOptions) {
  const cs = getComputedStyle(card)
  const bg = cs.backgroundColor || '#ffffff'
  const ink = cs.color || '#0a0e2c'
  const muted = resolveColor('hsl(var(--muted-foreground))')
  const pad = 24
  const head = subtitle ? 62 : 44
  const legendRows = legend.length > 1 ? 24 : 0
  const foot = 26
  const W = Math.max(picture.width + pad * 2, 480)
  const H = picture.height + pad + head + legendRows + foot

  const root = document.createElementNS(SVG_NS, 'svg')
  root.setAttribute('xmlns', SVG_NS)
  root.setAttribute('width', String(W))
  root.setAttribute('height', String(H))
  const rect = document.createElementNS(SVG_NS, 'rect')
  rect.setAttribute('width', String(W))
  rect.setAttribute('height', String(H))
  rect.setAttribute('fill', bg)
  root.appendChild(rect)
  root.appendChild(text(pad, pad + 14, title, 16, ink, 600))
  if (subtitle) root.appendChild(text(pad, pad + 34, subtitle.length > 140 ? `${subtitle.slice(0, 137)}...` : subtitle, 12, muted))
  let lx = pad
  if (legendRows) {
    for (const l of legend) {
      // Line series get a line key, bars a box, as on screen
      const lineKey = l.shape === 'line' || l.shape === 'dash'
      const sw = document.createElementNS(SVG_NS, lineKey ? 'line' : 'rect')
      if (lineKey) {
        sw.setAttribute('x1', String(lx)); sw.setAttribute('x2', String(lx + 12)); sw.setAttribute('y1', String(head + 11)); sw.setAttribute('y2', String(head + 11))
        sw.setAttribute('stroke', resolveColor(l.color)); sw.setAttribute('stroke-width', '2'); sw.setAttribute('stroke-linecap', 'round')
        if (l.shape === 'dash') sw.setAttribute('stroke-dasharray', '4 3')
      } else {
        sw.setAttribute('x', String(lx)); sw.setAttribute('y', String(head + 6)); sw.setAttribute('width', '10'); sw.setAttribute('height', '10'); sw.setAttribute('rx', '2')
        sw.setAttribute('fill', resolveColor(l.color))
        // A soft column keys with its own wash
        if (l.shape === 'column') sw.setAttribute('fill-opacity', '0.35')
      }
      root.appendChild(sw)
      root.appendChild(text(lx + 16, head + 15, l.name, 12, muted))
      lx += 28 + l.name.length * 6.8
    }
  }
  const clone = picture.svg.cloneNode(true) as SVGSVGElement
  inlineStyles(picture.svg, clone)
  clone.setAttribute('x', String(pad))
  clone.setAttribute('y', String(head + legendRows))
  clone.setAttribute('width', String(picture.width))
  clone.setAttribute('height', String(picture.height))
  clone.style.overflow = 'visible'
  root.appendChild(clone)
  const stamp = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
  root.appendChild(text(pad, H - 10, `PGME admin analytics. Exported ${stamp} IST`, 11, muted))

  const data = new XMLSerializer().serializeToString(root)
  const img = new Image()
  img.decoding = 'async'
  const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('The picture could not be drawn.')); img.src = url })
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = W * scale
    canvas.height = H * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('The picture could not be drawn.')
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0, W, H)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    if (!blob) throw new Error('The picture could not be drawn.')
    save(blob, `${name}.png`)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** An SVG for a list of ranked bars, which the page draws in HTML. */
export function barsPicture(rows: { name: string; value: string; parts: { share: number; color: string }[] }[], width: number): ChartPicture {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
  const rowH = 38
  const height = Math.max(rowH, rows.length * rowH)
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  const ink = resolveColor('hsl(var(--foreground))')
  const track = resolveColor('var(--chart-track)')
  rows.forEach((r, i) => {
    const y = i * rowH
    svg.appendChild(text(0, y + 13, r.name.length > 70 ? `${r.name.slice(0, 67)}...` : r.name, 13, ink, 500))
    svg.appendChild(text(width, y + 13, r.value, 13, ink, 600, 'end'))
    const base = document.createElementNS(SVG_NS, 'rect')
    base.setAttribute('x', '0'); base.setAttribute('y', String(y + 20)); base.setAttribute('width', String(width)); base.setAttribute('height', '8'); base.setAttribute('rx', '4'); base.setAttribute('fill', track)
    svg.appendChild(base)
    let x = 0
    for (const p of r.parts) {
      const w = Math.max(0, p.share * width)
      if (w <= 0) continue
      const seg = document.createElementNS(SVG_NS, 'rect')
      seg.setAttribute('x', String(x)); seg.setAttribute('y', String(y + 20)); seg.setAttribute('width', String(Math.max(1, w - (r.parts.length > 1 ? 2 : 0)))); seg.setAttribute('height', '8'); seg.setAttribute('rx', '3')
      seg.setAttribute('fill', resolveColor(p.color))
      svg.appendChild(seg)
      x += w
    }
  })
  return { svg, width, height }
}
