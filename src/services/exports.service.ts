import { apiService } from './api.service'

const BASE_PATH = 'admin/exports'

type PackageExportParams = {
  package_id?: string
  series_id?: string
  module_id?: string
  document_id?: string
}

export type PreviewColumn = { header: string; key: string }

export type ExportPreviewData = {
  rows: Record<string, unknown>[]
  columns: PreviewColumn[]
  count: number
}

class ExportsService {
  async usersBySubject(subjectId: string) {
    return apiService.downloadBlob(
      `${BASE_PATH}/users-by-subject`,
      { subject_id: subjectId },
      'users_by_subject.xlsx',
    )
  }

  async usersBySession(sessionId: string) {
    return apiService.downloadBlob(
      `${BASE_PATH}/users-by-session`,
      { session_id: sessionId },
      'users_by_session.xlsx',
    )
  }

  async usersByPackage(params: PackageExportParams) {
    return apiService.downloadBlob(
      `${BASE_PATH}/users-by-package`,
      params,
      'users_by_package.xlsx',
    )
  }

  async usersByEbook(bookId: string) {
    return apiService.downloadBlob(
      `${BASE_PATH}/users-by-ebook`,
      { book_id: bookId },
      'users_by_ebook.xlsx',
    )
  }

  async previewUsersBySubject(subjectId: string): Promise<ExportPreviewData> {
    const res = await apiService.get<ExportPreviewData>(
      `${BASE_PATH}/users-by-subject`,
      { params: { subject_id: subjectId, format: 'json' } },
    )
    return res.data!
  }

  async previewUsersBySession(sessionId: string): Promise<ExportPreviewData> {
    const res = await apiService.get<ExportPreviewData>(
      `${BASE_PATH}/users-by-session`,
      { params: { session_id: sessionId, format: 'json' } },
    )
    return res.data!
  }

  async previewUsersByPackage(params: PackageExportParams): Promise<ExportPreviewData> {
    const res = await apiService.get<ExportPreviewData>(
      `${BASE_PATH}/users-by-package`,
      { params: { ...params, format: 'json' } },
    )
    return res.data!
  }

  async previewUsersByEbook(bookId: string): Promise<ExportPreviewData> {
    const res = await apiService.get<ExportPreviewData>(
      `${BASE_PATH}/users-by-ebook`,
      { params: { book_id: bookId, format: 'json' } },
    )
    return res.data!
  }
}

export const exportsService = new ExportsService()
