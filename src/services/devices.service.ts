import { apiService, ApiResponse } from './api.service'

/** Why a device session ended (backend `ended_reason`). */
export type DeviceEndReason =
  | 'signed_out_by_admin'
  | 'device_limit'
  | 'signed_out_elsewhere'
  | 'signed_out'
  | 'expired'
  | 'session_ended'

export interface DeviceAuditEntry {
  at: string
  event: 'signed_in' | 'signed_out' | 'refused' | string
  reason: DeviceEndReason | null
  admin_name: string | null
  note: string | null
}

export interface StudentDevice {
  session_id: string
  device_id: string
  device_name: string
  device_type: 'iOS' | 'Android' | 'Web' | 'Tablet'
  client: 'app' | 'web_store'
  first_seen_at: string | null
  last_active: string | null
  login_time: string | null
  is_active: boolean
  counts_toward_limit: boolean
  ended_at: string | null
  ended_reason: DeviceEndReason | null
  ended_by_admin_name: string | null
  ended_note: string | null
  login_refused_at: string | null
  /** Which limit refused the sign-in (absent on an older backend). */
  login_refused_reason?: 'device_limit' | 'device_switch_limit' | null
  /** When a sign-in here last counted toward the new-device limit. */
  new_device_at?: string | null
  audit: DeviceAuditEntry[]
}

/** The new-device limit (App settings device_switch_limit) for one student. */
export interface DeviceSwitchLimit {
  enabled: boolean
  limit: number
  window_days: number
  used: number
  remaining: number | null
  reached: boolean
  counting_since: string
  next_free_at: string | null
  last_reset: { at: string; admin_name: string | null; note: string | null } | null
  devices: { session_id: string; device_name: string; device_type: string; client: 'app' | 'web_store'; counted_at: string }[]
}

export type SignInEndReason = DeviceEndReason | 'replaced'

/** One line of the sign-in log: a sign-in (and how it ended) or a refused sign-in. */
export interface SignInLogEntry {
  kind: 'sign_in' | 'refused'
  session_id: string
  device_id: string
  device_name: string
  device_type: StudentDevice['device_type'] | null
  client: 'app' | 'web_store'
  signed_in_at: string | null
  last_active_at: string | null
  signed_out_at: string | null
  end_reason: SignInEndReason | null
  end_reason_label: string | null
  ended_by: 'self' | 'another_device' | 'admin' | 'limit' | 'expired' | 'unknown' | 'same_device' | null
  ended_by_admin_name: string | null
  note: string | null
  is_current: boolean
  new_device: boolean
  refused_at: string | null
  refused_reason: 'device_limit' | 'device_switch_limit' | null
  refused_reason_label: string | null
}

export interface SignInLog {
  student: { user_id: string; name: string | null; student_id: string | null; phone_number: string | null }
  timezone: string
  range: { from: string | null; to: string | null }
  summary: { sign_ins: number; refused: number; devices: number; signed_in_now: number; last_active_at: string | null }
  entries: SignInLogEntry[]
  pagination: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean }
}

export interface DevicePolicy {
  max_devices: number
  action: 'refuse' | 'sign_out_oldest'
  count_web_store: boolean
  enabled: boolean
}

export interface StudentDevices {
  devices: StudentDevice[]
  policy: DevicePolicy
  counts: { total: number; active: number; counted_active: number }
  last_signed_out_all: { at: string; reason: string; admin_name: string | null; note: string | null } | null
  /** Absent on an older backend. */
  switch_limit?: DeviceSwitchLimit
}

class DevicesService {
  private path = (userId: string) => `admin/users/${userId}/devices`

  /** GET /admin/users/:id/devices (users.read) */
  async list(userId: string): Promise<ApiResponse<StudentDevices>> {
    return apiService.get<StudentDevices>(this.path(userId))
  }

  /** POST /admin/users/:id/devices/:sessionId/sign-out (users.update) */
  async signOut(userId: string, sessionId: string, note?: string): Promise<ApiResponse<{ device: StudentDevice; already_signed_out: boolean }>> {
    return apiService.post(`${this.path(userId)}/${sessionId}/sign-out`, note ? { note } : {})
  }

  /** POST /admin/users/:id/devices/sign-out-all (users.update) */
  async signOutAll(userId: string, note?: string): Promise<ApiResponse<{ signed_out: number }>> {
    return apiService.post(`${this.path(userId)}/sign-out-all`, note ? { note } : {})
  }

  /** GET /admin/users/:id/devices/sign-in-log (users.read). `from`/`to` are IST days. */
  async signInLog(userId: string, params: { from?: string; to?: string; page?: number; limit?: number } = {}): Promise<ApiResponse<SignInLog>> {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
    const qs = q.toString()
    return apiService.get<SignInLog>(`${this.path(userId)}/sign-in-log${qs ? `?${qs}` : ''}`)
  }

  /** GET /admin/users/:id/devices/sign-in-log/export (users.read): saves the CSV. */
  async exportSignInLog(userId: string, params: { from?: string; to?: string } = {}): Promise<{ filename: string }> {
    return apiService.downloadBlob(`${this.path(userId)}/sign-in-log/export`, { from: params.from || undefined, to: params.to || undefined }, 'sign-in-log.csv')
  }

  /** POST /admin/users/:id/devices/switch-limit/reset (users.update) */
  async resetSwitchLimit(userId: string, note?: string): Promise<ApiResponse<{ switch_limit: DeviceSwitchLimit }>> {
    return apiService.post(`${this.path(userId)}/switch-limit/reset`, note ? { note } : {})
  }
}

export const devicesService = new DevicesService()
