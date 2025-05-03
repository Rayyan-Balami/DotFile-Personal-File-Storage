import mongoose from "mongoose";

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
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

export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  plan: string;
  storageUsed: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export interface JwtUserPayload {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}
