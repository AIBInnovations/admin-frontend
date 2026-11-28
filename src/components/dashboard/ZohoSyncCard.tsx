import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { zohoService, PriceSyncSummary } from '@/services/zoho.service'

/**
 * Dashboard quick action: audits every package/book/session/form's Mongo price
 * against its live Zoho item rate and fixes any mismatch. Recovery tool for the
 * case where a price edit didn't propagate to Zoho (see COUPONS_INTEGRATION_PLAN.md
 * — Mongo price and the Zoho item rate must match or invoices/coupons compute
 * against the wrong number).
 */
export function ZohoSyncCard() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PriceSyncSummary | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await zohoService.syncPrices()
      if (res.success && res.data) {
        setResult(res.data)
        const { checked, fixed, failed } = res.data
        if (failed > 0) {
          toast.error(`Checked ${checked}: fixed ${fixed}, ${failed} failed (see details below)`)
        } else if (fixed > 0) {
          toast.success(`Checked ${checked}: fixed ${fixed} price mismatch${fixed === 1 ? '' : 'es'}`)
        } else {
          toast.success(`Checked ${checked}: all prices already in sync`)
        }
      } else {
        toast.error(res.message || 'Sync failed')
      }
    } catch (err) {
      toast.error((err instanceof Error && err.message) || 'Sync failed. It may still be running on the server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="rounded-xl shadow-card">
      <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <CardTitle className="text-[15px] font-semibold">Zoho Price Sync</CardTitle>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Checks every package, book, session, and form price against its live Zoho item and fixes any mismatch.
          </p>
        </div>
        <Button onClick={handleSync} disabled={loading} size="sm" className="shrink-0">
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking…</>
          ) : (
            <><RefreshCw className="mr-2 h-4 w-4" />Sync Prices</>
          )}
        </Button>
      </CardHeader>

      {result && (
        <CardContent>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mb-3">
            <span className="text-muted-foreground">Checked: <strong className="text-foreground">{result.checked}</strong></span>
            <span className="text-muted-foreground">Already matched: <strong className="text-foreground">{result.matched}</strong></span>
            {result.fixed > 0 && (
              <span className="text-success">Fixed: <strong>{result.fixed}</strong></span>
            )}
            {result.failed > 0 && (
              <span className="text-danger">Failed: <strong>{result.failed}</strong></span>
            )}
          </div>

          {result.mismatches.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              No drift found. Mongo and Zoho prices match everywhere.
            </div>
          ) : (
            <div className="rounded-lg border divide-y max-h-64 overflow-y-auto">
              {result.mismatches.map((m) => (
                <div key={`${m.type}:${m.id}`} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-medium truncate block">{m.name}</span>
                    <span className="text-muted-foreground capitalize">{m.type.replace('_', ' ')}</span>
                  </div>
                  {m.status === 'fixed' ? (
                    <Badge className="bg-success-soft text-success border-transparent text-xs shrink-0 whitespace-nowrap">
                      ₹{m.zohoPriceBefore} → ₹{m.zohoPriceAfter}
                    </Badge>
                  ) : (
                    <Badge className="bg-danger-soft text-danger border-transparent text-xs shrink-0 max-w-[200px] truncate" title={m.error}>
                      {m.error || 'Failed'}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
