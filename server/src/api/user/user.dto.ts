import { UserPlanResponseDTO } from "../plan/plan.dto.js";

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

export interface UpdateUserRefreshTokenDTO {
  refreshToken: string | null;
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
