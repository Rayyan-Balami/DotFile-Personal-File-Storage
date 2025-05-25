import userDAO from "@api/user/user.dao.js";
import {
  AdminSetPasswordDTO,
  AdminUpdateStorageDTO,
  CreateUserDTO,
  JwtUserPayload,
  LoginUserDTO,
  UpdateUserDTO,
  UpdateUserPasswordDTO,
  UpdateUserRoleDTO,
  UserResponseDTO,
} from "@api/user/user.dto.js";
import { IUser } from "@api/user/user.model.js";
import { REFRESH_TOKEN_SECRET } from "@config/constants.js";
import { ApiError } from "@utils/apiError.utils.js";
import { createUserDirectory } from "@utils/mkdir.utils.js";
import { sanitizeDocument } from "@utils/sanitizeDocument.utils.js";
import jwt from "jsonwebtoken";

/**
 * Service class for user-related business logic
 * Handles operations between controllers and data access layer
 */

// new ApiError(statusCode: number, message?: string, errors?: string[]): ApiError
class UserService {
  /**
   * Generate access and refresh tokens for a user
   *
   * @param user User object
   * @returns Object containing access and refresh tokens
   */
  async generateAccessAndRefreshTokens(user: IUser) {
    // Generate access token
    const accessToken = user.generateAccessToken();

    // Generate refresh token
    const refreshToken = user.generateRefreshToken();

    // Set refresh token for the user
    const updatedUser = await userDAO.setUserRefreshToken(
      user.id,
      refreshToken
    );

    // Check if user exists and refresh token was set
    if (!updatedUser || !updatedUser.refreshToken) {
      throw new ApiError(500, [{ auth: "Failed to create session" }]);
    }

    // Return tokens
    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Register a new user and generate authentication tokens
   *
   * @param data User registration data
   * @returns Newly created user data and authentication tokens
   * @throws ApiError if email already exists
   */
  async registerUserWithTokens(data: CreateUserDTO): Promise<{
    user: UserResponseDTO;
    accessToken: string;
    refreshToken: string;
  }> {
    // Check if email is already in use
    const existingUser = await userDAO.getUserByEmail(data.email);
    if (existingUser) {
      throw new ApiError(409, [
        { email: "Email is already linked to an account." },
      ]);
    }

    // Create user with default storage limit
    const user = await userDAO.createUser(data);

    // Generate tokens
    const { accessToken, refreshToken } =
      await this.generateAccessAndRefreshTokens(user);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Register a new user without automatically logging them in
   *
   * @param data User registration data
   * @returns Newly created user data
   * @throws ApiError if email already exists
   */
  async registerUser(data: CreateUserDTO): Promise<UserResponseDTO> {
    // Check if email is already in use
    const existingUser = await userDAO.getUserByEmail(data.email);
    if (existingUser) {
      throw new ApiError(409, [
        { email: "Email is already linked to an account." },
      ]);
    }

    // Create user with default storage limit
    const user = await userDAO.createUser(data);

    // Create user directory after user is created
    createUserDirectory(user.id);

    // Return only the user data, no tokens
    return this.sanitizeUser(user);
  }

  /**
   * Authenticate user and generate tokens
   *
   * @param credentials User login credentials
   * @param deviceInfo Information about the device being used
   * @returns User data and authentication tokens
   * @throws ApiError if credentials are invalid
   */
  async loginUser(credentials: LoginUserDTO): Promise<{
    user: UserResponseDTO;
    accessToken: string;
    refreshToken: string;
  }> {
    // Find user by email
    const user = await userDAO.getUserByEmail(credentials.email, {
      includePassword: true,
    });

    if (!user) {
      // Use a generic error message that doesn't reveal if the email exists
      throw new ApiError(401, [{ auth: "Invalid email or password" }]);
    }

    // Verify password
    const validPassword = await user.checkPassword(credentials.password);

    if (!validPassword) {
      // Use the same generic error message to prevent user enumeration
      throw new ApiError(401, [{ auth: "Invalid email or password" }]);
    }

    // Generate tokens
    const { accessToken, refreshToken } =
      await this.generateAccessAndRefreshTokens(user);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Logout user by clearing refresh token
   *
   * @param userId User ID
   * @returns Boolean indicating success
   */
  async logoutUser(userId: string): Promise<boolean> {
    // Find user by ID
    const user = await userDAO.getUserById(userId);
    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Clear the refresh token
    const loggedOutUser = await userDAO.clearUserRefreshToken(userId);

    if (!loggedOutUser) {
      throw new ApiError(500, [{ logout: "Failed to logout user" }]);
    }
    return true;
  }

  /**
   * Retrieve user by ID
   *
   * @param id User ID
   * @returns User data if found
   * @throws ApiError if user not found
   */
  async getUserById(
    id: string,
    options?: { includeRefreshToken?: boolean; deletedAt?: boolean }
  ): Promise<UserResponseDTO> {
    const user = await userDAO.getUserById(id, options);
    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    return this.sanitizeUser(user);
  }

  /**
   * Update user information
   *
   * @param id User ID
   * @param data Updated user data
   * @returns Updated user data
   * @throws ApiError if user not found or email already in use
   */
  async updateUser(id: string, data: UpdateUserDTO): Promise<UserResponseDTO> {
    // Check if email is being changed and if it's already in use by another user
    if (data.email) {
      const existingUser = await userDAO.getUserByEmail(data.email);
      if (existingUser && existingUser.id.toString() !== id) {
        throw new ApiError(409, [
          { email: "Email is already linked to an account by another account" },
        ]);
      }
    }

    const updatedUser = await userDAO.updateUser(id, data);
    if (!updatedUser) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Update user password
   *
   * @param id User ID
   * @param passwordData Password change data with old and new password
   * @returns Updated user data
   * @throws ApiError if user not found or old password is incorrect
   */
  async updateUserPassword(
    id: string,
    passwordData: UpdateUserPasswordDTO
  ): Promise<UserResponseDTO> {
    const updatedUser = await userDAO.updateUserPassword(id, passwordData);

    if (!updatedUser) {
      throw new ApiError(400, [
        { currentPassword: "Invalid current password or user not found" },
      ]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Set user password (admin only)
   *
   * @param id User ID
   * @param passwordData Password data with new password
   * @returns Updated user data
   * @throws ApiError if user not found
   */
  async adminSetUserPassword(
    id: string,
    passwordData: AdminSetPasswordDTO
  ): Promise<UserResponseDTO> {
    // Set the new password
    const updatedUser = await userDAO.adminSetUserPassword(
      id,
      passwordData.newPassword
    );

    if (!updatedUser) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Update a user's role (admin only)
   *
   * @param userId User ID
   * @param roleData Object containing the new role
   * @returns Updated user data
   * @throws ApiError if user not found
   */
  async updateUserRole(
    userId: string,
    roleData: UpdateUserRoleDTO
  ): Promise<UserResponseDTO> {
    // Ensure the user exists first
    const existingUser = await userDAO.getUserById(userId);
    if (!existingUser) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Update the user role
    const updatedUser = await userDAO.updateUserRole(userId, roleData.role);

    if (!updatedUser) {
      throw new ApiError(500, [{ role: "Failed to update user role" }]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Soft delete a user account
   *
   * @param id User ID
   * @returns Deleted user data
   * @throws ApiError if user not found
   */
  async softDeleteUser(id: string): Promise<UserResponseDTO> {
    const deletedUser = await userDAO.softDeleteUser(id);

    if (!deletedUser) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    return this.sanitizeUser(deletedUser);
  }

  /**
   * Get all users (typically an admin function)
   *
   * @param includeDeleted Whether to include soft-deleted users
   * @returns Array of user data
   */
  async getAllUsers(
    includeDeleted: boolean = false
  ): Promise<UserResponseDTO[]> {
    const users = await userDAO.getAllUsers(includeDeleted);
    return users.map((user) => this.sanitizeUser(user));
  }

  /**
   * Update user storage usage
   *
   * @param userId User ID
   * @param bytesToAdd Bytes to add (positive) or subtract (negative)
   * @returns Updated user data with new storage usage
   * @throws ApiError if user not found
   */
  async updateUserStorageUsage(
    userId: string,
    bytesToAdd: number
  ): Promise<UserResponseDTO> {
    // First check if user exists
    const user = await userDAO.getUserById(userId);
    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Update storage calculation
    const updatedUser = await userDAO.updateUser(userId, {
      storageUsed: Math.max(0, (user.storageUsed || 0) + bytesToAdd),
    });

    if (!updatedUser) {
      throw new ApiError(500, [{ storage: "Failed to update storage usage" }]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Refresh access token using refresh token
   *
   * @param refreshToken The refresh token provided by the client
   * @param deviceInfo The device information
   * @returns User data and new tokens (access + refresh)
   * @throws ApiError if refresh token is invalid or expired
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    user: UserResponseDTO;
    newAccessToken: string;
    newRefreshToken: string;
  }> {
    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      REFRESH_TOKEN_SECRET
    ) as JwtUserPayload;

    // Find user by ID
    const user = await userDAO.getUserById(decoded.id, {
      includeRefreshToken: true,
    });
    if (!user) {
      throw new ApiError(401, [{ refreshToken: "Invalid refresh token" }]);
    }

    // Check if the refresh token matches the stored one
    if (user.refreshToken !== refreshToken) {
      throw new ApiError(401, [
        { refreshToken: "Expired or used refresh token" },
      ]);
    }

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await this.generateAccessAndRefreshTokens(user);

    return {
      user: this.sanitizeUser(user),
      newAccessToken,
      newRefreshToken,
    };
  }

  /**
   * Update user's storage limit (admin only)
   *
   * @param userId User ID to update
   * @param storageData New storage limit data
   * @returns Updated user data
   * @throws ApiError if user not found or invalid storage limit
   */
  async updateUserStorageLimit(
    userId: string,
    storageData: AdminUpdateStorageDTO
  ): Promise<UserResponseDTO> {
    // First check if user exists
    const user = await userDAO.getUserById(userId);
    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Validate new storage limit
    if (storageData.maxStorageLimit < user.storageUsed) {
      throw new ApiError(400, [
        {
          maxStorageLimit:
            "New storage limit cannot be less than current storage used",
        },
      ]);
    }

    // Update the storage limit
    const updatedUser = await userDAO.updateUserStorageLimit(
      userId,
      storageData.maxStorageLimit
    );

    if (!updatedUser) {
      throw new ApiError(500, [{ storage: "Failed to update storage limit" }]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Restore a soft-deleted user (admin only)
   * 
   * @param userId User ID to restore
   * @returns Restored user data
   * @throws ApiError if user not found or not deleted
   */
  async restoreUser(userId: string): Promise<UserResponseDTO> {
    // First check if user exists and is deleted
    const user = await userDAO.getUserById(userId, { deletedAt: true });
    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    if (!user.deletedAt) {
      throw new ApiError(400, [{ user: "User is not deleted" }]);
    }

    // Restore the user
    const restoredUser = await userDAO.restoreUser(userId);
    if (!restoredUser) {
      throw new ApiError(500, [{ restore: "Failed to restore user" }]);
    }

    return this.sanitizeUser(restoredUser);
  }

  /**
   * Remove sensitive data from user object
   *
   * @param user User document
   * @returns Sanitized user object safe for client
   */
  private sanitizeUser(user: IUser): UserResponseDTO {
    // First use the general sanitizer
    return sanitizeDocument<UserResponseDTO>(user, {
      excludeFields: ["password", "__v"],
      recursive: true,
    });
  }
}

export default new UserService();
