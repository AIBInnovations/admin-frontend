import { apiService, ApiResponse } from './api.service';

// Types
export interface AdminUser {
  admin_id: string;
  name: string;
  email: string;
  role_name: string;
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  requires_otp: boolean;
  // Present when requires_otp is true
  admin_id?: string;
  identifier?: string;
  phone?: string;
  // Present when requires_otp is false (direct login)
  access_token?: string;
  refresh_token?: string;
  admin?: AdminUser;
}

export interface VerifyOTPCredentials {
  admin_id: string;
  access_token: string;
}

export interface VerifyOTPResponse {
  access_token: string;
  refresh_token: string;
  admin: AdminUser;
}

export interface RefreshTokenResponse {
  access_token: string;
}

export interface ForgotPasswordResponse {
  admin_id: string;
  identifier: string;
  phone: string;
}

export interface ResetPasswordCredentials {
  admin_id: string;
  access_token: string;
  new_password: string;
}

class AuthService {
  /**
   * Login admin user
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    const response = await apiService.post<LoginResponse>('admin/auth/login', credentials);

    if (response.success && response.data && !response.data.requires_otp) {
      // Direct login (no phone / no OTP needed)
      this.storeAuthData(
        response.data.access_token!,
        response.data.refresh_token!,
        response.data.admin!
      );
    }

    return response;
  }

  /**
   * Verify admin OTP for 2FA login
   */
  async verifyOTP(credentials: VerifyOTPCredentials): Promise<ApiResponse<VerifyOTPResponse>> {
    const response = await apiService.post<VerifyOTPResponse>('admin/auth/verify-otp', credentials);

    if (response.success && response.data) {
      this.storeAuthData(
        response.data.access_token,
        response.data.refresh_token,
        response.data.admin
      );
    }

    return response;
  }

  /**
   * Initiate forgot password — look up admin by email, get OTP state
   */
  async forgotPassword(email: string): Promise<ApiResponse<ForgotPasswordResponse>> {
    return apiService.post<ForgotPasswordResponse>('admin/auth/forgot-password', { email });
  }

  /**
   * Reset admin password after OTP verification
   */
  async resetPassword(credentials: ResetPasswordCredentials): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('admin/auth/reset-password', credentials);
  }

  /**
   * Logout admin user
   */
  async logout(): Promise<void> {
    try {
      // Optional: Call logout endpoint if backend has one
      // await apiService.post('admin/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local auth data
      this.clearAuthData();
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<ApiResponse<RefreshTokenResponse>> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<RefreshTokenResponse>('admin/auth/refresh', {
      refresh_token: refreshToken,
    });

    if (response.success && response.data) {
      this.storeAccessToken(response.data.access_token);
    }

    return response;
  }

  /**
   * Store authentication data
   */
  private storeAuthData(accessToken: string, refreshToken: string, admin: AdminUser): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('admin_user', JSON.stringify(admin));
  }

  /**
   * Store access token only (used during refresh)
   */
  private storeAccessToken(accessToken: string): void {
    localStorage.setItem('access_token', accessToken);
  }

  /**
   * Clear all authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('admin_user');
  }

  /**
   * Get stored access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Get stored admin user data
   */
  getAdminUser(): AdminUser | null {
    const userStr = localStorage.getItem('admin_user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as AdminUser;
    } catch (error) {
      console.error('Failed to parse admin user data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const admin = this.getAdminUser();
    if (!admin) return false;
    return admin.permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    const admin = this.getAdminUser();
    if (!admin) return false;
    return permissions.some(permission => admin.permissions.includes(permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    const admin = this.getAdminUser();
    if (!admin) return false;
    return permissions.every(permission => admin.permissions.includes(permission));
  }

  /**
   * Check if user has specific role
   */
  hasRole(roleName: string): boolean {
    const admin = this.getAdminUser();
    if (!admin) return false;
    return admin.role_name === roleName;
  }
}

// Export singleton instance
export const authService = new AuthService();
