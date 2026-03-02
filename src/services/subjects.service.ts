import { apiService, ApiResponse } from './api.service';
import type { DeleteImpactResponse } from '@/types/api.types';

// Types
export interface Subject {
  _id: string;
  name: string;
  description: string | null;
  icon_url?: string;
  whatsapp_community_link?: string | null;
  display_order: number;
  is_active: boolean;
  package_count?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectPackage {
  _id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number;
  is_on_sale: boolean;
  sale_price: number | null;
  duration_days: number;
  is_active: boolean;
  display_order: number;
  createdAt: string;
}

export interface SubjectDetail extends Subject {
  packages: SubjectPackage[];
}

export interface SubjectFormData {
  name: string;
  description?: string;
  whatsapp_community_link?: string;
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
  async getSubject(subjectId: string): Promise<ApiResponse<SubjectDetail>> {
    const response = await apiService.get<{ subject: SubjectDetail }>(`admin/subjects/${subjectId}`);
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
   * Get delete impact — checks what depends on this entity before deletion
   */
  async getDeleteImpact(subjectId: string): Promise<ApiResponse<DeleteImpactResponse>> {
    return apiService.get<DeleteImpactResponse>(`admin/subjects/${subjectId}/delete-impact`);
  }

  /**
   * Toggle subject active status using update endpoint
   */
  async toggleActive(subjectId: string, isActive: boolean): Promise<ApiResponse<Subject>> {
    return this.updateSubject(subjectId, { is_active: isActive } as SubjectFormData);
  }

  /**
   * Upload icon image to Cloudinary
   */
  async uploadIcon(subjectId: string, file: File): Promise<ApiResponse<Subject>> {
    const formData = new FormData()
    formData.append('icon', file)

    const response = await apiService.post<{ subject: Subject }>(
      `admin/subjects/${subjectId}/icon`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.subject,
      }
    }
    return response as any
  }

  /**
   * Delete icon from subject
   */
  async deleteIcon(subjectId: string): Promise<ApiResponse<Subject>> {
    const response = await apiService.delete<{ subject: Subject }>(
      `admin/subjects/${subjectId}/icon`
    )
    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.subject,
      }
    }
    return response as any
  }
}

// Export singleton instance
export const subjectsService = new SubjectsService();
