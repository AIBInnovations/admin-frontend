import { apiService, type ApiResponse } from './api.service'

/** Required = must be filled; optional = asked, may be left empty; off = not asked. */
export type ProfileFieldRule = 'required' | 'optional' | 'off'

export interface ProfileField {
  key: string
  /** What the student sees. */
  label: string
  rule: ProfileFieldRule
  default_rule: ProfileFieldRule
  type: 'text' | 'email' | 'date' | 'choice' | 'address' | 'phone' | 'id'
  /** False for name, phone number, student ID and email (fixed rules). */
  configurable: boolean
  /** student = typed on the form; sign_in = the phone number used to sign in; auto = made by the server. */
  source: 'student' | 'sign_in' | 'auto'
  asked: boolean
  editable_after_signup: boolean
  max_length?: number
  options?: { value: string; label: string }[]
}

export interface ProfileFieldsConfig {
  version: number
  fields: ProfileField[]
  is_default: boolean
  updated_at: string | null
  updated_by_name: string | null
}

class ProfileFieldsService {
  async get(): Promise<ApiResponse<ProfileFieldsConfig>> {
    return apiService.get<ProfileFieldsConfig>('admin/profile-fields')
  }

  /** `basedOn` = the updated_at this page loaded; a newer save by someone else answers 409. */
  async save(fields: { key: string; rule: ProfileFieldRule }[], basedOn: string | null): Promise<ApiResponse<ProfileFieldsConfig>> {
    return apiService.put<ProfileFieldsConfig>('admin/profile-fields', { fields, based_on: basedOn })
  }
}

export const profileFieldsService = new ProfileFieldsService()
