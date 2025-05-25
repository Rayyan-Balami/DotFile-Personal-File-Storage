import {
  CreateUserDTO,
  UpdateUserDTO,
  UpdateUserPasswordDTO,
  UpdateUserRefreshTokenDTO,
  UserRole,
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
   * @param userId - MongoDB ObjectId string of the user
   * @param options - Options for including refresh token and/or deleted users
   * @returns User document if found, null otherwise
   */
  async getUserById(
    userId: string,
    options: { includeRefreshToken?: boolean; deletedAt?: boolean } = {}
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const { includeRefreshToken = false, deletedAt = false } = options;
    
    const query = User.findOne({
      _id: userId,
      ...(deletedAt ? {} : { deletedAt: null }),
    });
    
    // Either exclude refreshToken or include all fields
    if (includeRefreshToken) {
      query.select("+refreshToken");
    }
    
    return await query;
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

    const query = User.findOne({
      email,
      ...(deletedAt ? {} : { deletedAt: null }),
    });
    
    // Either exclude password or include it, but don't restrict other fields
    if (includePassword) {
      query.select("+password");
    }

    return await query;
  }

  /**
   * Update a user's information
   *
   * @param userId - MongoDB ObjectId string of the user
   * @param user - Update data conforming to UpdateUserDTO
   * @param deletedAt - When true, allows updating soft-deleted users
   * @returns Updated user document if found and updated, null otherwise
   */
  async updateUser(
    userId: string,
    user: UpdateUserDTO,
    deletedAt: boolean = false
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    return await User.findOneAndUpdate(
      { _id: userId, ...(deletedAt ? {} : { deletedAt: null }) },
      user,
      { new: true }
    );
  }

  /**
   * Update a user's password after verifying the old password
   *
   * @param userId - MongoDB ObjectId string of the user
   * @param password - Object containing oldPassword and newPassword
   * @returns Updated user document if password change successful, null otherwise
   */
  async updateUserPassword(
    userId: string,
    password: UpdateUserPasswordDTO
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;

    // Find user and verify they exist
    const existingUser = await User.findById(userId).select("+password");
    if (!existingUser) return null;

    // Verify old password matches before allowing update
    const isMatch = await existingUser.checkPassword(password.oldPassword);
    if (!isMatch) return null;

    // Set new password and save (password hashing occurs in pre-save hook)
    existingUser.password = password.newPassword;
    return await existingUser.save();
  }

  /**
   * Set a user's password directly (admin only, no old password required)
   *
   * @param userId - MongoDB ObjectId string of the user
   * @param newPassword - New password to set
   * @returns Updated user document if password set successfully, null otherwise
   */
  async adminSetUserPassword(
    userId: string,
    newPassword: string
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;

    // Find user and verify they exist
    const existingUser = await User.findById(userId);
    if (!existingUser) return null;

    // Set new password and save (password hashing occurs in pre-save hook)
    existingUser.password = newPassword;
    return await existingUser.save();
  }

  /**
   * Update a user's refresh token
   *
   * @param userId - MongoDB ObjectId string of the user
   * @param refreshToken - New refresh token to set
   * @returns Updated user document if found and updated, null otherwise
   */
  async updateUserRefreshToken(
    userId: string,
    tokenData: UpdateUserRefreshTokenDTO
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    return await User.findOneAndUpdate(
      { _id: userId },
      { refreshToken: tokenData.refreshToken },
      { new: true }
    );
  }

  /**
   * Set a refresh token for a user
   *
   * @param userId - MongoDB ObjectId string of the user
   * @param refreshToken - New refresh token
   * @returns Updated user document if found and updated, null otherwise
   */
  async setUserRefreshToken(
    userId: string,
    refreshToken: string
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    return await User.findOneAndUpdate(
      { _id: userId },
      { refreshToken },
      { new: true }
    ).select("+refreshToken");
  }

  /**
   * Clear the refresh token for a user
   *
   * @param userId - MongoDB ObjectId string of the user
   * @returns Updated user document if found and token removed, null otherwise
   */
  async clearUserRefreshToken(
    userId: string
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    return await User.findOneAndUpdate(
      { _id: userId },
      { $set: { refreshToken: null } },
      { new: true }
    );
  }

  /**
   * Update a user's role (admin only)
   *
   * @param userId - MongoDB ObjectId string of the user
   * @param role - New role from UserRole enum
   * @returns Updated user document if found and updated, null otherwise
   */
  async updateUserRole(
    userId: string,
    role: UserRole
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    return await User.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { role },
      { new: true }
    );
  }

  /**
   * Soft delete a user by setting deletedAt timestamp
   *
   * @param userId - MongoDB ObjectId string of the user
   * @returns Updated user document with deletedAt timestamp if successful, null otherwise
   */
  async softDeleteUser(userId: string): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    return await User.findOneAndUpdate(
      { _id: userId },
      { deletedAt: new Date() },
      { new: true }
    );
  }


  /**
   * Restore a soft-deleted user by removing the deletedAt timestamp
   *
   * @param userId - MongoDB ObjectId string of the user
   * @returns Updated user document with deletedAt set to null if successful, null otherwise
   */
  async restoreUser(userId: string): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    return await User.findOneAndUpdate(
      { _id: userId },
      { deletedAt: null },
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

  /**
   * Update a user's storage limit (admin only)
   * 
   * @param userId - MongoDB ObjectId string of the user
   * @param maxStorageLimit - New storage limit in bytes
   * @returns Updated user document if found and updated, null otherwise
   */
  async updateUserStorageLimit(
    userId: string,
    maxStorageLimit: number
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    return await User.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { maxStorageLimit },
      { new: true }
    );
  }
}

export default new UserDAO();
