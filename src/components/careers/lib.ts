import type { Tone } from '@/components/common/detail'
import type { CareerStatus } from '@/services/careers.service'

/** Pending is called New everywhere in the panel. */
export const STATUS: Record<CareerStatus, { label: string; tone: Tone; action: string; doing: string; done: string }> = {
  pending: { label: 'New', tone: 'info', action: 'Back to New', doing: 'Moving…', done: 'Moved back to New' },
  reviewed: { label: 'Reviewed', tone: 'neutral', action: 'Mark reviewed', doing: 'Marking…', done: 'Marked reviewed' },
  accepted: { label: 'Accepted', tone: 'success', action: 'Accept', doing: 'Accepting…', done: 'Application accepted' },
  rejected: { label: 'Rejected', tone: 'danger', action: 'Reject', doing: 'Rejecting…', done: 'Application rejected' },
}

export const STATUS_ORDER: CareerStatus[] = ['pending', 'reviewed', 'accepted', 'rejected']

export const statusLabel = (s: string) => STATUS[s as CareerStatus]?.label ?? s

/** History title: "Marked reviewed", "Accepted", "Moved back to New". */
export const historyTitle = (s: CareerStatus) => ({ pending: 'Moved back to New', reviewed: 'Marked reviewed', accepted: 'Accepted', rejected: 'Rejected' })[s] ?? s

const istDateTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** "27 Nov 2026, 2:05 pm IST" */
export function istStamp(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${istDateTime.format(d)} IST`
}

/** A web link worth opening: http(s) only, with the domain to show. */
export function webLink(value: string | null | undefined): { href: string; domain: string } | null {
  if (!value) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return { href: url.href, domain: url.hostname.replace(/^www\./, '') }
  } catch {
    return null
  }
}

/**
 * The number for wa.me: digits only, with India's 91 in front of a bare
 * 10-digit mobile number (or one written with a leading 0).
 */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  return digits.length >= 7 && digits.length <= 15 ? digits : null
}

/** tel: keeps a leading + and the digits. */
export const telHref = (phone: string) => `tel:${phone.trim().startsWith('+') ? '+' : ''}${phone.replace(/\D/g, '')}`

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`
