import { toast } from 'sonner'

export function copyShareLink(label = 'Link'): void {
  const url = window.location.href
  navigator.clipboard
    .writeText(url)
    .then(() => toast.success(`${label} copied to clipboard`))
    .catch(() => {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea')
      el.value = url
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      toast.success(`${label} copied to clipboard`)
    })
}

export function copyText(text: string, label = 'Text'): void {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(`${label} copied`))
    .catch(() => toast.error('Failed to copy'))
}
