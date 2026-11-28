/**
 * One CSV line. Cells are quoted, and text that a spreadsheet would run as a
 * formula (a name typed as "=cmd()") is kept as text. Phone numbers are not
 * touched.
 */
export function csvLine(cells: unknown[]): string {
  return cells.map((value) => {
    let s = value === null || value === undefined ? '' : String(value)
    if (/^[=@\t\r]/.test(s) || /^[+-](?![\d\s()-]+$)/.test(s)) s = `'${s}`
    return `"${s.replace(/"/g, '""')}"`
  }).join(',')
}
