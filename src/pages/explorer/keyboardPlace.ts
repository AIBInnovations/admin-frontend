/**
 * Opening a folder replaces the whole page, which would drop a keyboard user
 * back to the top. When the folder was opened with the keyboard, the new
 * contents list takes the focus instead.
 */
let wanted = false
export function keepKeyboardPlace() { wanted = true }
export function takeKeyboardPlace(): boolean {
  const was = wanted
  wanted = false
  return was
}
