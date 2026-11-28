import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/components/common/detail'
import { invoicesService, type Invoice } from '@/services/invoices.service'

type Target = Pick<Invoice, '_id' | 'invoice_number'>

/**
 * Download, refresh and email for an invoice, shared by the list and its page.
 * All three need Zoho Books; when it is not connected the server says so.
 */
export function useInvoiceActions(onChanged: () => void) {
  const [busy, setBusy] = useState<{ id: string; action: 'pdf' | 'regenerate' | 'email' } | null>(null)
  const running = useRef(false)

  const run = async (inv: Target, action: 'pdf' | 'regenerate' | 'email', work: () => Promise<string | null>, failed: string) => {
    if (running.current) return
    running.current = true
    setBusy({ id: inv._id, action })
    try {
      const message = await work()
      if (message) toast.success(message)
      if (action !== 'pdf') onChanged()
    } catch (e) {
      toast.error(apiErrorMessage(e, failed))
    } finally {
      running.current = false
      setBusy(null)
    }
  }

  return {
    busy,
    download: (inv: Target) => run(inv, 'pdf', async () => { await invoicesService.downloadPdf(inv); return null }, 'The PDF could not be downloaded.'),
    regenerate: (inv: Target) => run(inv, 'regenerate', async () => { await invoicesService.regenerate(inv._id); return `${inv.invoice_number} regenerated from Zoho Books` }, 'The invoice could not be regenerated.'),
    email: (inv: Target) => run(inv, 'email', async () => { const r = await invoicesService.emailAgain(inv._id); return `${inv.invoice_number} emailed to ${r.data?.emailed_to || 'the student'}` }, 'The invoice could not be emailed.'),
  }
}
