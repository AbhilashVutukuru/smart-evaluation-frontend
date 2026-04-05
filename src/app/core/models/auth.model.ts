export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  requirePasswordChange: boolean;
  accessToken: string; // Will be in HttpOnly cookie
  refreshToken: string; // Will be in HttpOnly cookie
  accessTokenExpiresAt:  string;
  userId?: string; // Optional user info
  email?: string;
  role?: string;
  schoolId?: string;
  message?: string;
  schoolName: string; 
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
  schoolId: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}
