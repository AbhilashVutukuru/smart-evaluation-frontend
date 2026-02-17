export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userName: string;
  email: string;
  role: string;
  requirePasswordChange: boolean; 
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
   email: string; 
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
  schoolId:number
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}
