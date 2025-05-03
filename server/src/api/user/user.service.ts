import userDAO from "./user.dao.js";
import {
  CreateUserDTO,
  LoginUserDTO,
  UpdateUserDTO,
  UpdateUserPasswordDTO,
  UserResponseDTO,
} from "./user.dto.js";
import { IUser } from "./user.model.js";
import { ApiError } from "../../utils/apiError.js";
import { sanitizeDocument } from "../../utils/sanitizeDocument.js";

/**
 * Service class for user-related business logic
 * Handles operations between controllers and data access layer
 */

// new ApiError(statusCode: number, message?: string, errors?: string[]): ApiError
class UserService {
  /**
   * Generate access and refresh tokens for a user
   *
   * @param userId User ID
   * @returns Object containing access and refresh tokens
   * @throws ApiError if user not found
   */
  async generateAccessAndRefreshTokens(userId: string) {
    // Find user by ID
    const user = await userDAO.getUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found", ["id"]);
    }

    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // set refresh token in the database
    await userDAO.updateUserRefreshToken(userId, {
      refreshToken,
    });

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
  async registerUser(data: CreateUserDTO): Promise<{
    user: UserResponseDTO;
    accessToken: string;
    refreshToken: string;
  }> {
    // Check if email is already in use
    const existingUser = await userDAO.getUserByEmail(data.email);
    if (existingUser) {
      throw new ApiError(409, "Email already in use", ["email"]);
    }

    // Create the user in database
    const user = await userDAO.createUser(data);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateAccessAndRefreshTokens(user.id);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticate user and generate tokens
   *
   * @param credentials User login credentials
   * @returns User data and authentication tokens
   * @throws ApiError if credentials are invalid
   */
  async loginUser(credentials: LoginUserDTO): Promise<{
    user: UserResponseDTO;
    accessToken: string;
    refreshToken: string;
  }> {
    // Find user by email
    const user = await userDAO.getUserByEmail(credentials.email);
    if (!user) {
      throw new ApiError(401, "Invalid credentials", ["email"]);
    }

    // Verify password
    const validPassword = await user.checkPassword(credentials.password);
    if (!validPassword) {
      throw new ApiError(401, "Invalid credentials", ["password"]);
    }

    // Generate tokens
    const { accessToken, refreshToken } =
      await this.generateAccessAndRefreshTokens(user.id);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async logoutUser(userId: string): Promise<boolean> {
    // Find user by ID
    const user = await userDAO.getUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found", ["id"]);
    }
    // Clear refresh token in the database
    const loggedOutUser = await userDAO.updateUserRefreshToken(userId, {
      refreshToken: null,
    });

    if (!loggedOutUser) {
      throw new ApiError(500, "Failed to logout user", ["logout"]);
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
  async getUserById(id: string): Promise<UserResponseDTO> {
    const user = await userDAO.getUserById(id);
    if (!user) {
      throw new ApiError(404, "User not found", ["id"]);
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
        throw new ApiError(409, "Email already in use by another account", [
          "email",
        ]);
      }
    }

    const updatedUser = await userDAO.updateUser(id, data);
    if (!updatedUser) {
      throw new ApiError(404, "User not found", ["id"]);
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
      throw new ApiError(400, "Invalid current password or user not found", [
        "password",
      ]);
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
  async deleteUser(id: string): Promise<UserResponseDTO> {
    const deletedUser = await userDAO.deleteUser(id);

    if (!deletedUser) {
      throw new ApiError(404, "User not found", ["id"]);
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
      throw new ApiError(404, "User not found", ["id"]);
    }

    // Update storage calculation
    const updatedUser = await userDAO.updateUser(userId, {
      storageUsed: Math.max(0, (user.storageUsed || 0) + bytesToAdd),
    });

    if (!updatedUser) {
      throw new ApiError(500, "Failed to update storage usage", ["storage"]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Remove sensitive data from user object
   *
   * @param user User document
   * @returns Sanitized user object safe for client
   */
  private sanitizeUser(user: IUser): UserResponseDTO {
    return sanitizeDocument<UserResponseDTO>(user, {
      excludeFields: ["password", "refreshToken"],
    });
  }
}

export default new UserService();
