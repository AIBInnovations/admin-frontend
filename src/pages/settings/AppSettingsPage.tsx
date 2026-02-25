import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Settings, Loader2, Save, Globe, Phone, Share2, Smartphone } from 'lucide-react'
import { appSettingsService, AppSettingRecord } from '@/services/appSettings.service'
import { toast } from 'sonner'

// Section configuration: which keys belong to which section
const SECTIONS = [
  {
    id: 'general',
    title: 'General',
    description: 'Core application settings',
    icon: Settings,
    keys: ['maintenance_mode'],
  },
  {
    id: 'android_version',
    title: 'Android Version Control',
    description: 'Manage minimum required version and force update for Android',
    icon: Smartphone,
    keys: ['android_min_version', 'android_store_url', 'android_force_update'],
  },
  {
    id: 'ios_version',
    title: 'iOS Version Control',
    description: 'Manage minimum required version and force update for iOS',
    icon: Smartphone,
    keys: ['ios_min_version', 'ios_store_url', 'ios_force_update'],
  },
  {
    id: 'social',
    title: 'Social Media Links',
    description: 'Social media profile URLs displayed in the app',
    icon: Share2,
    keys: ['instagram_url', 'youtube_url', 'twitter_url'],
  },
  {
    id: 'support',
    title: 'Support Info',
    description: 'Contact information for user support',
    icon: Phone,
    keys: ['whatsapp_support_number', 'whatsapp_support_url', 'support_email', 'support_phone'],
  },
]

// Keys that should render as boolean toggles
const BOOLEAN_KEYS = new Set(['maintenance_mode', 'android_force_update', 'ios_force_update'])

// All known keys (to detect "other" settings)
const KNOWN_KEYS = new Set(SECTIONS.flatMap((s) => s.keys))

// Human-readable labels
const KEY_LABELS: Record<string, string> = {
  maintenance_mode: 'Maintenance Mode',
  android_min_version: 'Minimum Version',
  android_store_url: 'Play Store URL',
  android_force_update: 'Force Update',
  ios_min_version: 'Minimum Version',
  ios_store_url: 'App Store URL',
  ios_force_update: 'Force Update',
  instagram_url: 'Instagram URL',
  youtube_url: 'YouTube URL',
  twitter_url: 'X (Twitter) URL',
  whatsapp_support_number: 'WhatsApp Support Number',
  whatsapp_support_url: 'WhatsApp Support URL',
  support_email: 'Support Email',
  support_phone: 'Support Phone',
}

// Default descriptions for keys not yet in DB
const KEY_DESCRIPTIONS: Record<string, string> = {
  maintenance_mode: 'Flag to enable/disable maintenance mode',
  android_min_version: 'Minimum required Android app version (e.g. 1.6.5). Users below this version will be blocked.',
  android_store_url: 'Google Play Store listing URL for the app',
  android_force_update: 'When enabled, Android users below the minimum version cannot use the app',
  ios_min_version: 'Minimum required iOS app version (e.g. 1.6.5). Users below this version will be blocked.',
  ios_store_url: 'Apple App Store listing URL for the app',
  ios_force_update: 'When enabled, iOS users below the minimum version cannot use the app',
  instagram_url: 'Instagram profile URL',
  youtube_url: 'YouTube channel URL',
  twitter_url: 'X (Twitter) profile URL',
  whatsapp_support_number: 'WhatsApp support contact number for user assistance',
  whatsapp_support_url: 'WhatsApp support chat URL',
  support_email: 'Support email address',
  support_phone: 'Support phone number',
}

function getLabel(key: string): string {
  return KEY_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AppSettingsPage() {
  const [settings, setSettings] = useState<AppSettingRecord[]>([])
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await appSettingsService.getAdminAll()
      if (response.success && response.data) {
        const records = response.data.settings
        setSettings(records)
        // Start with empty strings for all known keys so sections always render
        const values: Record<string, string> = {}
        for (const key of KNOWN_KEYS) {
          values[key] = BOOLEAN_KEYS.has(key) ? 'false' : ''
        }
        // Override with actual DB values
        records.forEach((s) => {
          values[s.key] = s.value
        })
        setEditValues(values)
        setHasChanges(false)
      }
    } catch {
      toast.error('Failed to load app settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleChange = (key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleToggle = (key: string, checked: boolean) => {
    handleChange(key, checked ? 'true' : 'false')
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      // Only save keys that have a value or already exist in DB
      const payload = Object.entries(editValues)
        .filter(([key, value]) => value !== '' || settings.some((s) => s.key === key))
        .map(([key, value]) => {
          const existing = settings.find((s) => s.key === key)
          const description = existing?.description || KEY_DESCRIPTIONS[key]
          return {
            key,
            value,
            ...(description ? { description } : {}),
          }
        })
      const response = await appSettingsService.bulkUpdate(payload)
      if (response.success) {
        toast.success('Settings saved successfully')
        await fetchSettings()
      } else {
        toast.error('Failed to save settings')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="App Settings"
          description="Manage platform configuration settings"
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

  // Group settings by section
  const otherKeys = Object.keys(editValues).filter((k) => !KNOWN_KEYS.has(k))

  const renderField = (key: string) => {
    const value = editValues[key] ?? ''

    const description = settings.find((s) => s.key === key)?.description || KEY_DESCRIPTIONS[key] || ''

    if (BOOLEAN_KEYS.has(key)) {
      return (
        <div key={key} className="flex items-center justify-between py-3">
          <div>
            <Label className="text-sm font-medium">{getLabel(key)}</Label>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <Switch
            checked={value === 'true'}
            onCheckedChange={(checked) => handleToggle(key, checked)}
          />
        </div>
      )
    }

    return (
      <div key={key} className="space-y-1.5 py-3">
        <Label htmlFor={key} className="text-sm font-medium">
          {getLabel(key)}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <Input
          id={key}
          value={value}
          onChange={(e) => handleChange(key, e.target.value)}
          className="font-mono text-sm"
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="App Settings"
        description="Manage platform configuration settings"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Settings' },
          { label: 'App Settings' },
        ]}
        action={
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        }
      />

      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const sectionKeys = section.keys.filter((k) => k in editValues)
          if (sectionKeys.length === 0) return null

          const Icon = section.icon
          return (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {sectionKeys.map((key) => renderField(key))}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {otherKeys.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Other</CardTitle>
                  <CardDescription>Additional settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {otherKeys.map((key) => renderField(key))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
