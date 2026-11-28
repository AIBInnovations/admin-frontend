import { z } from 'zod'
import type { HomeSectionItem, HomeSectionItemFormData } from '@/services/homeSections.service'
import { hexProblem } from './ColorInput'

/** `other` keeps a link this form does not edit (a screen set up elsewhere). */
export type ClickAction = 'none' | 'external_url' | 'theory_package' | 'practical_package' | 'ebook' | 'live_session' | 'other'

export interface ActionValues { button_text: string; action: ClickAction; target: string; url: string }

export interface ItemFormValues {
  card_type: string
  title: string
  subtitle: string
  description: string
  tag_label: string
  tag_color: string
  background_color: string
  text_color: string
  border_color: string
  button_color: string
  button_text_color: string
  primary: ActionValues
  secondary: ActionValues
  metadata: { label: string; value: string; icon_url: string }[]
  display_order: number | null
  is_active: boolean
}

const ROUTES: Record<string, ClickAction> = {
  '/revision-series': 'theory_package',
  '/practical-series': 'practical_package',
  '/ebook-store': 'ebook',
  '/session/:id': 'live_session',
}
/** Whether this form knows the screen a link opens. */
export const knowsRoute = (route: string | null | undefined) => !!route && route in ROUTES

const PARAM: Partial<Record<ClickAction, string>> = { theory_package: 'packageId', practical_package: 'packageId', ebook: 'bookId', live_session: 'id' }
const ROUTE_OF = Object.fromEntries(Object.entries(ROUTES).map(([r, a]) => [a, r])) as Partial<Record<ClickAction, string>>

function readAction(button: string | null, type: string | null | undefined, route: string | null, params: Record<string, string> | null, url: string | null): ActionValues {
  const base = { button_text: button || '', target: '', url: url || '' }
  if (type === 'external') return { ...base, action: 'external_url' }
  if (type === 'internal' && route) {
    const action = ROUTES[route] ?? 'other'
    const key = PARAM[action]
    return { ...base, action, target: (key && params?.[key]) || '' }
  }
  return { ...base, action: 'none' }
}

export const BLANK_ITEM = (): ItemFormValues => ({
  card_type: 'info_card', title: '', subtitle: '', description: '', tag_label: '', tag_color: '', background_color: '', text_color: '', border_color: '',
  button_color: '', button_text_color: '',
  primary: { button_text: '', action: 'none', target: '', url: '' },
  secondary: { button_text: '', action: 'none', target: '', url: '' },
  metadata: [], display_order: 0, is_active: true,
})

export const toItemValues = (i: HomeSectionItem): ItemFormValues => ({
  card_type: i.card_type || 'info_card', title: i.title || '', subtitle: i.subtitle || '', description: i.description || '',
  tag_label: i.tag_label || '', tag_color: i.tag_color || '', background_color: i.background_color || '', text_color: i.text_color || '', border_color: i.border_color || '',
  button_color: i.button_color || '', button_text_color: i.button_text_color || '',
  primary: readAction(i.button_text, i.link_type, i.internal_route, i.internal_params, i.external_url),
  secondary: readAction(i.secondary_button_text, i.secondary_link_type, i.secondary_internal_route, i.secondary_internal_params, i.secondary_external_url),
  metadata: (i.metadata || []).map((m) => ({ label: m.label, value: m.value, icon_url: m.icon_url || '' })),
  display_order: i.display_order ?? 0, is_active: i.is_active ?? true,
})

const COLOURS = ['tag_color', 'background_color', 'text_color', 'border_color', 'button_color', 'button_text_color'] as const
const isUrl = (s: string) => { try { return /^https?:$/.test(new URL(s).protocol) } catch { return false } }
const TARGET_ERROR: Partial<Record<ClickAction, string>> = {
  theory_package: 'Please select a package', practical_package: 'Please select a package', ebook: 'Please select a book', live_session: 'Please select a session',
}

export const itemSchema = z.custom<ItemFormValues>().superRefine((d, ctx) => {
  const fail = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', message, path })
  const max = (key: 'title' | 'subtitle' | 'description' | 'tag_label', n: number) => { if (d[key].trim().length > n) fail([key], `Keep this under ${n} characters`) }
  if (!d.card_type) fail(['card_type'], 'Card type is required')
  max('title', 200); max('subtitle', 300); max('description', 2000); max('tag_label', 100)
  for (const key of COLOURS) { const p = hexProblem(d[key].trim()); if (p) fail([key], p) }
  for (const side of ['primary', 'secondary'] as const) {
    const a = d[side]
    if (a.button_text.trim().length > 100) fail([side, 'button_text'], 'Keep this under 100 characters')
    if (a.action === 'external_url' && !isUrl(a.url.trim())) fail([side, 'url'], a.url.trim() ? 'Invalid URL' : 'External URL is required')
    const missing = TARGET_ERROR[a.action]
    if (missing && !a.target) fail([side, 'target'], missing)
  }
  d.metadata.forEach((m, i) => {
    if (!m.label.trim()) fail(['metadata', i, 'label'], 'Label is required')
    if (!m.value.trim()) fail(['metadata', i, 'value'], 'Value is required')
  })
  if (d.display_order != null && (!Number.isInteger(d.display_order) || d.display_order < 0)) fail(['display_order'], 'Enter a whole number, 0 or more')
})

interface Link { link_type: string; url?: string; route?: string; params?: Record<string, string> }

function writeAction(a: ActionValues, kept: { route: string | null; params: Record<string, string> | null } | null): Link {
  if (a.action === 'external_url') return { link_type: 'external', url: a.url.trim() }
  if (a.action === 'other' && kept?.route) return { link_type: 'internal', route: kept.route, params: kept.params ?? undefined }
  const route = ROUTE_OF[a.action]
  const param = PARAM[a.action]
  if (route && param) return { link_type: 'internal', route, params: { [param]: a.target } }
  return { link_type: 'none' }
}

/**
 * The API's shape. On an edit, an empty string clears a text and null clears a
 * colour (or, through `media`, an image or icon). A link the item no longer
 * uses is cleared by the API when the link type changes.
 */
export function toItemPayload(d: ItemFormValues, item: HomeSectionItem | null, media: { image_url?: string | null; image_s3_key?: string | null; icon_url?: string | null; icon_s3_key?: string | null }): HomeSectionItemFormData {
  const text = (s: string) => s.trim() || (item ? '' : undefined)
  const colour = (s: string) => s.trim() || (item ? null : undefined)
  const primary = writeAction(d.primary, item ? { route: item.internal_route, params: item.internal_params } : null)
  const secondary = writeAction(d.secondary, item ? { route: item.secondary_internal_route, params: item.secondary_internal_params } : null)
  const metadata = d.metadata.map((m) => ({ label: m.label.trim(), value: m.value.trim(), icon_url: m.icon_url.trim() || undefined }))
  return {
    card_type: d.card_type,
    title: text(d.title), subtitle: text(d.subtitle), description: text(d.description),
    ...media,
    tag_label: text(d.tag_label), tag_color: colour(d.tag_color),
    background_color: colour(d.background_color), text_color: colour(d.text_color), border_color: colour(d.border_color),
    button_text: text(d.primary.button_text), button_color: colour(d.button_color), button_text_color: colour(d.button_text_color),
    link_type: primary.link_type, external_url: primary.url, internal_route: primary.route, internal_params: primary.params,
    secondary_button_text: text(d.secondary.button_text),
    secondary_link_type: secondary.link_type, secondary_external_url: secondary.url, secondary_internal_route: secondary.route, secondary_internal_params: secondary.params,
    metadata: metadata.length > 0 ? metadata : item ? [] : undefined,
    display_order: d.display_order ?? undefined,
    is_active: d.is_active,
  }
}
