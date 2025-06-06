/**
 * New user registration data
 */
export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
}

/**
 * User login credentials
 */
export interface LoginUserDTO {
  email: string;
  password: string;
}

/**
 * Optional user profile updates
 * Note: Email updates removed for security - handle through separate verification process
 * Note: Avatar updates removed - use separate avatar upload endpoint for security
 */
export interface UpdateUserDTO {
  name?: string;
  storageUsed?: number;
  deletedAt?: Date | null;
}

/**
 * Password change with verification
 */
export interface UpdateUserPasswordDTO {
  oldPassword: string;
  newPassword: string;
}

/**
 * Admin: Direct password reset
 */
export interface AdminSetPasswordDTO {
  newPassword: string;
  confirmNewPassword: string;
}

/**
 * Admin: Role change request
 */
export interface UpdateUserRoleDTO {
  role: UserRole;
}

/**
 * User account deletion with password confirmation
 */
export interface DeleteUserAccountDTO {
  password: string;
}

/**
 * Session token update
 */
export interface UpdateUserRefreshTokenDTO {
  refreshToken: string | null;
}

/**
 * Token refresh request
 */
export interface RefreshTokenDTO {
  refreshToken?: string; // Optional since it could come from cookies
}

/**
 * Available user role types
 */
export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

/**
 * Sanitized user data for client
 */
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

/**
 * JWT token payload structure
 */
export interface JwtUserPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
}

/**
 * Admin: Storage quota update
 */
export interface AdminUpdateStorageDTO {
  maxStorageLimit: number;
}
