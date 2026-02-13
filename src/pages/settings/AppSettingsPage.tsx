import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, Loader2 } from 'lucide-react'
import { appSettingsService, AppSettings } from '@/services/appSettings.service'
import { toast } from 'sonner'

export function AppSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true)
        const response = await appSettingsService.getAll()
        if (response.success && response.data) {
          setSettings(response.data.settings)
        }
      } catch (error) {
        toast.error('Failed to load app settings')
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  if (loading) {
    return (
      <div>
        <PageHeader
          title="App Settings"
          description="View platform configuration settings"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Settings' },
            { label: 'App Settings' },
          ]}
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!settings || Object.keys(settings).length === 0) {
    return (
      <div>
        <PageHeader
          title="App Settings"
          description="View platform configuration settings"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Settings' },
            { label: 'App Settings' },
          ]}
        />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">No settings available.</p>
        </div>
      </div>
    )
  }

  const entries = Object.entries(settings)

  return (
    <div>
      <PageHeader
        title="App Settings"
        description="View platform configuration settings"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Settings' },
          { label: 'App Settings' },
        ]}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Configuration</CardTitle>
              <CardDescription>Read-only view of current platform settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border rounded-lg border">
            {entries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                <div>
                  {typeof value === 'boolean' ? (
                    <Badge variant={value ? 'default' : 'outline'} className="text-[10px]">
                      {value ? 'Enabled' : 'Disabled'}
                    </Badge>
                  ) : (
                    <span className="text-sm font-mono">{String(value)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
