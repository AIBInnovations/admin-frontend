/**
 * Qualifications are stored as one line of text (older app builds show it as
 * is, e.g. "MBBS, MD (Anatomy), DNB"). The admin edits them as a list: these
 * turn one into the other. A comma, semicolon or new line starts a new item,
 * except inside brackets, so "MD (Pathology, Microbiology)" stays one item.
 */
const SEPARATORS = new Set([',', ';', '\n', '\r'])

export const MAX_QUALIFICATIONS = 20

export function splitQualifications(value: string | null | undefined): string[] {
  if (!value) return []
  const items: string[] = []
  let depth = 0
  let current = ''
  const push = () => {
    const item = current.replace(/\s+/g, ' ').trim()
    if (item && !items.some((i) => i.toLowerCase() === item.toLowerCase())) items.push(item)
    current = ''
  }
  for (const ch of value) {
    if (ch === '(' || ch === '[') depth += 1
    else if ((ch === ')' || ch === ']') && depth > 0) depth -= 1
    if (depth === 0 && SEPARATORS.has(ch)) { push(); continue }
    current += ch
  }
  push()
  return items
}

export function joinQualifications(items: string[]): string {
  return items.map((i) => i.replace(/\s+/g, ' ').trim()).filter(Boolean).join(', ')
}
