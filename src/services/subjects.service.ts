import { apiService, ApiResponse } from './api.service';

// Types
export interface Subject {
  _id: string;
  name: string;
  description: string | null;
  icon_url?: string;
  display_order: number;
  is_active: boolean;
  packages_count?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectFormData {
  name: string;
  description?: string;
  display_order?: number;
  is_active: boolean;
}

export interface SubjectsListParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean | null;
  sort_by?: 'display_order' | 'name' | 'createdAt';
  sort_order?: 'asc' | 'desc';
}

export interface SubjectsListResponse {
  entities: Subject[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface DeleteImpact {
  packages_count: number;
  series_count: number;
  modules_count: number;
  videos_count: number;
}

class SubjectsService {
  /**
   * Get list of subjects with pagination and filters
   */
  async getSubjects(params: SubjectsListParams = {}): Promise<ApiResponse<SubjectsListResponse>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.is_active !== null && params.is_active !== undefined) {
      queryParams.append('is_active', params.is_active.toString());
    }
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);

    const queryString = queryParams.toString();
    const url = `admin/subjects${queryString ? `?${queryString}` : ''}`;

    return apiService.get<SubjectsListResponse>(url);
  }

  /**
   * Get single subject by ID
   */
  async getSubject(subjectId: string): Promise<ApiResponse<Subject>> {
    const response = await apiService.get<{ subject: Subject }>(`admin/subjects/${subjectId}`);
    // Unwrap subject from response
    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.subject,
      };
    }
    return response as any;
  }

  /**
   * Create new subject
   */
  async createSubject(data: SubjectFormData): Promise<ApiResponse<Subject>> {
    const response = await apiService.post<{ subject: Subject }>('admin/subjects', data);
    // Unwrap subject from response
    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.subject,
      };
    }
    return response as any;
  }

  /**
   * Update existing subject
   */
  async updateSubject(subjectId: string, data: SubjectFormData): Promise<ApiResponse<Subject>> {
    const response = await apiService.put<{ subject: Subject }>(`admin/subjects/${subjectId}`, data);
    // Unwrap subject from response
    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.subject,
      };
    }
    return response as any;
  }

  /**
   * Delete subject
   * Note: Backend will throw error if packages exist
   */
  async deleteSubject(subjectId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`admin/subjects/${subjectId}`);
  }

  /**
   * Get delete impact (simulated - backend throws error directly)
   * This is kept for UI flow but won't be called
   */
  async getDeleteImpact(_subjectId: string): Promise<ApiResponse<DeleteImpact>> {
    // Backend doesn't have this endpoint - it throws error on delete if packages exist
    // Return empty impact for now (parameter prefixed with _ to indicate intentionally unused)
    return {
      success: true,
      message: 'No impact data available',
      data: {
        packages_count: 0,
        series_count: 0,
        modules_count: 0,
        videos_count: 0,
      },
    };
  }

  /**
   * Toggle subject active status using update endpoint
   */
  async toggleActive(subjectId: string, isActive: boolean): Promise<ApiResponse<Subject>> {
    return this.updateSubject(subjectId, { is_active: isActive } as SubjectFormData);
  }
}

// Export singleton instance
export const subjectsService = new SubjectsService();
