import planService from "@api/plan/plan.service.js";
import userDAO from "@api/user/user.dao.js";
import {
  AdminSetPasswordDTO,
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
import logger from "@utils/logger.utils.js";
import { sanitizeDocument } from "@utils/sanitizeDocument.utils.js";
import jwt from "jsonwebtoken";
import { createUserDirectory } from "@utils/mkdir.utils.js";
import { console } from "inspector";

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
   * @param deviceInfo Device information
   * @returns Object containing access and refresh tokens
   */
  async generateAccessAndRefreshTokens(user: IUser, deviceInfo: string) {
    // Generate access token
    const accessToken = user.generateAccessToken();

    // Generate refresh token
    const refreshToken = user.generateRefreshToken(deviceInfo);

    // Add refresh token to the user's tokens array
    const updatedUser = await userDAO.addUserRefreshToken(user.id, {
      refreshToken,
      deviceInfo,
    });

    // Check if user and refreshTokens exist before accessing
    if (
      !updatedUser ||
      !updatedUser.refreshTokens ||
      updatedUser.refreshTokens.length === 0
    ) {
      throw new ApiError(500, [{ auth: "Failed to create session" }]);
    }

    // Get the ID of the newly added token (last in the array)
    const sessionId =
      updatedUser.refreshTokens[
        updatedUser.refreshTokens.length - 1
      ]._id.toString();

    // Return tokens and session ID
    return {
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  /**
   * Register a new user and generate authentication tokens
   *
   * @param data User registration data
   * @param deviceInfo Information about the device being used
   * @returns Newly created user data and authentication tokens
   * @throws ApiError if email already exists
   */
  async registerUserWithTokens(
    data: CreateUserDTO,
    deviceInfo: string
  ): Promise<{
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

    // Get default plan
    const defaultPlan = await planService.getDefaultPlan();
    if (!defaultPlan) {
      throw new ApiError(500, [{ plan: "Default plan not found" }]);
    }

    // Create user with default plan
    const user = await userDAO.createUser({
      ...data,
      plan: defaultPlan.id,
    });

    // Generate tokens
    const { accessToken, refreshToken } =
      await this.generateAccessAndRefreshTokens(user, deviceInfo);

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

    // Get default plan
    const defaultPlan = await planService.getDefaultPlan();
    if (!defaultPlan) {
      throw new ApiError(500, [{ plan: "Default plan not found" }]);
    }

    // Create user with default plan
    const user = await userDAO.createUser({
      ...data,
      plan: defaultPlan.id,
    });

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
  async loginUser(
    credentials: LoginUserDTO,
    deviceInfo: string
  ): Promise<{
    user: UserResponseDTO;
    accessToken: string;
    refreshToken: string;
    sessionId: string;
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
    const { accessToken, refreshToken, sessionId } =
      await this.generateAccessAndRefreshTokens(user, deviceInfo);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  /**
   * Logout user from a specific device by removing the refresh token
   *
   * @param userId User ID
   * @param refreshToken Refresh token to invalidate
   * @returns Boolean indicating success
   */
  async logoutUser(userId: string, refreshToken: string): Promise<boolean> {
    // Find user by ID
    const user = await userDAO.getUserById(userId, {
      includeRefreshTokens: true,
    });
    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Remove the specific refresh token
    const loggedOutUser = await userDAO.removeSpecificRefreshToken(
      userId,
      refreshToken
    );

    if (!loggedOutUser) {
      throw new ApiError(500, [{ logout: "Failed to logout user" }]);
    }
    return true;
  }

  /**
   * Logout user from a specific device by the session ID
   *
   * @param userId User ID
   * @param sessionId ID of the session/refresh token to invalidate
   * @returns Boolean indicating success
   */
  async logoutUserSession(userId: string, sessionId: string): Promise<boolean> {
    // Find user by ID
    const user = await userDAO.getUserById(userId, {
      includeRefreshTokens: true,
    });

    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Remove the specific refresh token by ID
    const loggedOutUser = await userDAO.removeRefreshTokenBySessionId(
      userId,
      sessionId
    );

    if (!loggedOutUser) {
      throw new ApiError(404, [
        { session: "Session not found or already logged out" },
      ]);
    }

    return true;
  }

  /**
   * Logout user from all devices by clearing all refresh tokens
   *
   * @param userId User ID
   * @returns Boolean indicating success
   */
  async logoutFromAllDevices(userId: string): Promise<boolean> {
    // Find user by ID
    const user = await userDAO.getUserById(userId);
    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Clear all refresh tokens
    const loggedOutUser = await userDAO.clearAllUserRefreshTokens(userId);

    if (!loggedOutUser) {
      throw new ApiError(500, [
        { logout: "Failed to logout user from all devices" },
      ]);
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
    options?: { includeRefreshTokens?: boolean; deletedAt?: boolean }
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
  async refreshAccessToken(
    refreshToken: string,
    deviceInfo: string
  ): Promise<{
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
      includeRefreshTokens: true,
    });
    if (!user) {
      throw new ApiError(401, [{ refreshToken: "Invalid refresh token" }]);
    }

    // Check if the refresh token exists in the user's tokens array
    const tokenExists = user.findRefreshToken(refreshToken);
    if (!tokenExists) {
      throw new ApiError(401, [
        { refreshToken: "Expired or used refresh token" },
      ]);
    }

    // Remove the old refresh token
    await userDAO.removeSpecificRefreshToken(user.id, refreshToken);

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await this.generateAccessAndRefreshTokens(user, deviceInfo);

    return {
      user: this.sanitizeUser(user),
      newAccessToken,
      newRefreshToken,
    };
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
