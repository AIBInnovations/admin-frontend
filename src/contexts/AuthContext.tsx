import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService, AdminUser, LoginCredentials, VerifyOTPCredentials } from '@/services/auth.service';

// OTP state exposed to login page
export interface OTPState {
  admin_id: string;
  phone: string;
  otp_id: string;
  expires_in: number;
}

// Types
interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<OTPState | null>;
  verifyOTP: (credentials: VerifyOTPCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (roleName: string) => boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = () => {
    try {
      const storedUser = authService.getAdminUser();
      const hasToken = authService.isAuthenticated();

      // Both must exist for valid auth state
      if (hasToken && storedUser) {
        setUser(storedUser);
      } else {
        // Clear everything if state is inconsistent
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('admin_user');
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('admin_user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login step 1: email + password
   * Returns OTPState if OTP required, null if direct login
   */
  const login = async (credentials: LoginCredentials): Promise<OTPState | null> => {
    try {
      const response = await authService.login(credentials);

      if (response.success && response.data) {
        if (response.data.requires_otp) {
          // OTP required — return OTP state, don't navigate yet
          return {
            admin_id: response.data.admin_id!,
            phone: response.data.phone!,
            otp_id: response.data.otp_id!,
            expires_in: response.data.expires_in!,
          };
        }

        // Direct login (no phone on admin)
        setUser(response.data.admin!);
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
        return null;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  /**
   * Login step 2: verify OTP
   */
  const verifyOTP = async (credentials: VerifyOTPCredentials): Promise<void> => {
    try {
      const response = await authService.verifyOTP(credentials);

      if (response.success && response.data) {
        setUser(response.data.admin);
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        throw new Error(response.message || 'OTP verification failed');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    return authService.hasPermission(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return authService.hasAnyPermission(permissions);
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return authService.hasAllPermissions(permissions);
  };

  const hasRole = (roleName: string): boolean => {
    return authService.hasRole(roleName);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    verifyOTP,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
