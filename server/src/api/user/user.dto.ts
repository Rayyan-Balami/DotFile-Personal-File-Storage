import { UserPlanResponseDTO } from "@api/plan/plan.dto.js";

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  plan: string;
}

export interface LoginUserDTO {
  email: string;
  password: string;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
  avatar?: string;
  plan?: string;
  storageUsed?: number;
  deletedAt?: Date | null;
}

export interface UpdateUserPasswordDTO {
  oldPassword: string;
  newPassword: string;
}

export interface AdminSetPasswordDTO {
  newPassword: string;
  confirmNewPassword: string;
}

export interface UpdateUserRoleDTO {
  role: UserRole;
}

export interface UpdateUserRefreshTokenDTO {
  refreshToken: string | null;
  deviceInfo: string;
}

export interface RefreshTokenDTO {
  refreshToken?: string; // Optional since it could come from cookies
  deviceInfo?: string;   // Added device info
}

// Add this new interface
export interface RefreshTokenRecord {
  token: string;
  deviceInfo: string;
  createdAt: Date;
}

// Add this interface for session info
export interface SessionInfo {
  id: string;
  deviceInfo: string;
  createdAt: string;
}

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  plan: string | UserPlanResponseDTO;
  storageUsed: number;
  // Instead of refresh tokens, return sessions
  activeSessions?: SessionInfo[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface JwtUserPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
}
