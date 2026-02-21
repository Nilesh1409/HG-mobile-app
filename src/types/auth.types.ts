export interface User {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  referralCode: string;
  wallet: number;
  isVerified: boolean;
  aadhaarVerified: boolean;
  dlVerified: boolean;
  dlImageUrl: string | null;
  aadhaarDetails?: {
    name: string;
    dob: string;
    gender: string;
    address?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  mobile: string;
  referralCode?: string;
}

export interface SendOTPRequest {
  mobile: string;
}

export interface VerifyOTPRequest {
  mobile: string;
  otp: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  data: User;
}

export interface ApiResponse<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
}
