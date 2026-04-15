import { apiService } from './api.service'

const BASE_PATH = 'admin/exports'

type PackageExportParams = {
  package_id?: string
  series_id?: string
  module_id?: string
  document_id?: string
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
}

export const exportsService = new ExportsService()
