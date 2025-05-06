import {
  CreateUserDTO,
  UpdateUserDTO,
  UpdateUserPasswordDTO,
  UpdateUserRefreshTokenDTO,
} from "@api/user/user.dto.js";
import User, { IUser } from "@api/user/user.model.js";
import mongoose from "mongoose";

/**
 * Data Access Object for User operations
 * Handles all database interactions related to users
 */
export class UserDAO {
  /**
   * Create a new user in the database
   *
   * @param user - User data conforming to CreateUserDTO
   * @returns Newly created user document with all fields
   */
  async createUser(user: CreateUserDTO): Promise<IUser> {
    const newUser = new User(user);
    return await newUser.save();
  }

  /**
   * Find a user by their ID
   *
   * @param id - MongoDB ObjectId string of the user
   * @param options - Options for including refresh token and/or deleted users
   * @returns User document if found, null otherwise
   */
  async getUserById(
    id: string,
    options: { includeRefreshTokens?: boolean; deletedAt?: boolean } = {}
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const { includeRefreshTokens = false, deletedAt = false } = options;
    
    const query = User.findOne({
      _id: id,
      ...(deletedAt ? {} : { deletedAt: null }),
    });
    
    // Either exclude refreshTokens or include all fields
    if (includeRefreshTokens) {
      query.select("+refreshTokens");
    }
    
    return await query.populate({
      path: "plan",
      select: "-description -features",
    });
  }

  /**
   * Find a user by their email address
   *
   * @param email - User's email address (case sensitive)
   * @param deletedAt - When true, includes soft-deleted users in search
   * @returns User document if found, null otherwise
   */
  async getUserByEmail(
    email: string,
    options: { includePassword?: boolean; deletedAt?: boolean } = {}
  ): Promise<IUser | null> {
    const { includePassword = false, deletedAt = false } = options;

    // Instead of only selecting the password field
    // We want to either include or exclude the password
    const query = User.findOne({
      email,
      ...(deletedAt ? {} : { deletedAt: null }),
    });
    
    // Either exclude password or include it, but don't restrict other fields
    if (includePassword) {
      query.select("+password");
    }

    return await query.populate({
      path: "plan",
      select: "-description -features",
    });
  }

  /**
   * Update a user's information
   *
   * @param id - MongoDB ObjectId string of the user
   * @param user - Update data conforming to UpdateUserDTO
   * @param deletedAt - When true, allows updating soft-deleted users
   * @returns Updated user document if found and updated, null otherwise
   */
  async updateUser(
    id: string,
    user: UpdateUserDTO,
    deletedAt: boolean = false
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await User.findOneAndUpdate(
      { _id: id, ...(deletedAt ? {} : { deletedAt: null }) },
      user,
      { new: true }
    );
  }

  /**
   * Update a user's password after verifying the old password
   *
   * @param id - MongoDB ObjectId string of the user
   * @param password - Object containing oldPassword and newPassword
   * @returns Updated user document if password change successful, null otherwise
   */
  async updateUserPassword(
    id: string,
    password: UpdateUserPasswordDTO
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    // Find user and verify they exist
    const existingUser = await User.findById(id);
    if (!existingUser) return null;

    // Verify old password matches before allowing update
    const isMatch = await existingUser.checkPassword(password.oldPassword);
    if (!isMatch) return null;

    // Set new password and save (password hashing occurs in pre-save hook)
    existingUser.password = password.newPassword;
    return await existingUser.save();
  }

  /**
   * Update a user's refresh token
   *
   * @param id - MongoDB ObjectId string of the user
   * @param refreshToken - New refresh token to set
   * @returns Updated user document if found and updated, null otherwise
   */
  async updateUserRefreshToken(
    id: string,
    tokenData: UpdateUserRefreshTokenDTO
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await User.findOneAndUpdate(
      { _id: id },
      { refreshToken: tokenData.refreshToken },
      { new: true }
    );
  }

  /**
   * Add a refresh token to a user
   *
   * @param id - MongoDB ObjectId string of the user
   * @param tokenData - New refresh token and device info
   * @returns Updated user document if found and updated, null otherwise
   */
  async addUserRefreshToken(
    id: string,
    tokenData: { refreshToken: string; deviceInfo: string }
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await User.findOneAndUpdate(
      { _id: id },
      { 
        $push: { 
          refreshTokens: {
            token: tokenData.refreshToken,
            deviceInfo: tokenData.deviceInfo,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    ).select("+refreshTokens");
  }

  /**
   * Remove a specific refresh token from a user
   *
   * @param id - MongoDB ObjectId string of the user
   * @param token - Refresh token to remove
   * @returns Updated user document if found and token removed, null otherwise
   */
  async removeUserRefreshToken(
    id: string,
    token: string
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await User.findOneAndUpdate(
      { _id: id },
      { $pull: { refreshTokens: { token } } },
      { new: true }
    );
  }

  /**
   * Remove all refresh tokens from a user (logout from all devices)
   *
   * @param id - MongoDB ObjectId string of the user
   * @returns Updated user document with no refresh tokens if successful, null otherwise
   */
  async clearAllUserRefreshTokens(
    id: string
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await User.findOneAndUpdate(
      { _id: id },
      { $set: { refreshTokens: [] } },
      { new: true }
    );
  }

  /**
   * Soft delete a user by setting deletedAt timestamp
   *
   * @param id - MongoDB ObjectId string of the user
   * @returns Updated user document with deletedAt timestamp if successful, null otherwise
   */
  async deleteUser(id: string): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await User.findOneAndUpdate(
      { _id: id },
      { deletedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Get all users, optionally filtering for active or deleted users
   *
   * @param deletedAt - When true, returns only soft-deleted users; when false, returns only active users
   * @returns Array of user documents matching the criteria
   */
  async getAllUsers(deletedAt: boolean = false): Promise<IUser[]> {
    return await User.find({
      deletedAt: deletedAt ? { $ne: null } : null,
    });
  }
}

export default new UserDAO();
