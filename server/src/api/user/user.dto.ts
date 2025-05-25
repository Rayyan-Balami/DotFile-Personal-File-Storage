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
}

export interface RefreshTokenDTO {
  refreshToken?: string; // Optional since it could come from cookies
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
  maxStorageLimit: number;
  storageUsed: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  refreshToken?: string;
}

export interface JwtUserPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
}

export interface AdminUpdateStorageDTO {
  maxStorageLimit: number;
}
