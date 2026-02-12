import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Settings, Shield, Film, CreditCard, Bell, Save,
} from 'lucide-react'

export function AppSettingsPage() {
  // General Settings
  const [appName, setAppName] = useState('PGME')
  const [appDescription, setAppDescription] = useState('Post Graduate Medical Education Platform')
  const [supportEmail, setSupportEmail] = useState('support@pgme.com')
  const [supportPhone, setSupportPhone] = useState('+91 98765 43210')

  // Authentication Settings
  const [otpExpiry, setOtpExpiry] = useState('300')
  const [maxSessions, setMaxSessions] = useState('3')
  const [sessionTimeout, setSessionTimeout] = useState('30')

  // Content Settings
  const [maxVideoSize, setMaxVideoSize] = useState('2048')
  const [videoFormats, setVideoFormats] = useState('mp4, mov, avi')
  const [enableFreeContent, setEnableFreeContent] = useState(true)

  // Payment Settings
  const [paymentGateway, setPaymentGateway] = useState('zoho_payments')
  const [gstRate, setGstRate] = useState('18')
  const [currency, setCurrency] = useState('INR')

  // Notification Settings
  const [enablePush, setEnablePush] = useState(true)
  const [enableEmail, setEnableEmail] = useState(true)
  const [enableSMS, setEnableSMS] = useState(false)

  return (
    <div>
      <PageHeader
        title="App Settings"
        description="Configure platform settings, integrations, and feature flags"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Settings' },
          { label: 'App Settings' },
        ]}
      />

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">General Settings</CardTitle>
                <CardDescription>Basic platform information and contact details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="appName">App Name</Label>
                <Input id="appName" value={appName} onChange={(e) => setAppName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input id="supportEmail" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appDescription">App Description</Label>
                <Input id="appDescription" value={appDescription} onChange={(e) => setAppDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportPhone">Support Phone</Label>
                <Input id="supportPhone" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Authentication Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <Shield className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Authentication Settings</CardTitle>
                <CardDescription>OTP configuration and session management</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="otpExpiry">OTP Expiry (seconds)</Label>
                <Input id="otpExpiry" type="number" value={otpExpiry} onChange={(e) => setOtpExpiry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxSessions">Max Active Sessions</Label>
                <Input id="maxSessions" type="number" value={maxSessions} onChange={(e) => setMaxSessions(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input id="sessionTimeout" type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Content Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                <Film className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Content Settings</CardTitle>
                <CardDescription>Video upload limits and content configuration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxVideoSize">Max Video Upload Size (MB)</Label>
                <Input id="maxVideoSize" type="number" value={maxVideoSize} onChange={(e) => setMaxVideoSize(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoFormats">Allowed Video Formats</Label>
                <Input id="videoFormats" value={videoFormats} onChange={(e) => setVideoFormats(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="enableFreeContent">Enable Free Content</Label>
                <p className="text-xs text-muted-foreground">Allow users to access selected content for free</p>
              </div>
              <Switch id="enableFreeContent" checked={enableFreeContent} onCheckedChange={setEnableFreeContent} />
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <CreditCard className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base">Payment Settings</CardTitle>
                <CardDescription>Payment gateway, tax, and currency configuration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="paymentGateway">Payment Gateway</Label>
                <Select value={paymentGateway} onValueChange={setPaymentGateway}>
                  <SelectTrigger id="paymentGateway">
                    <SelectValue placeholder="Select gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zoho_payments">Zoho Payments</SelectItem>
                    <SelectItem value="razorpay">Razorpay</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstRate">GST Rate (%)</Label>
                <Input id="gstRate" type="number" value={gstRate} onChange={(e) => setGstRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Bell className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Notification Settings</CardTitle>
                <CardDescription>Configure notification channels and preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="enablePush">Enable Push Notifications</Label>
                <p className="text-xs text-muted-foreground">Send push notifications via Firebase Cloud Messaging</p>
              </div>
              <Switch id="enablePush" checked={enablePush} onCheckedChange={setEnablePush} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="enableEmail">Enable Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Send email notifications for important updates</p>
              </div>
              <Switch id="enableEmail" checked={enableEmail} onCheckedChange={setEnableEmail} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="enableSMS">Enable SMS Notifications</Label>
                <p className="text-xs text-muted-foreground">Send SMS alerts via MSG91 for critical events</p>
              </div>
              <Switch id="enableSMS" checked={enableSMS} onCheckedChange={setEnableSMS} />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
