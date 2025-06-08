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
 * UserDAO: DB access layer for user data (create, read, update, delete)
 */
export class UserDAO {
  /**
   * Create and save new user
   * @param user - New user input
   * @returns Saved user document
   */
  async createUser(user: CreateUserDTO): Promise<IUser> {
    const newUser = new User(user);
    return await newUser.save();
  }

  /**
   * Get user by ID with optional refresh token and deleted status
   * @param userId - User's MongoDB ID
   * @param options - Include refreshToken and/or deleted users flags
   * @returns User document or null
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
   * Get user by email with optional password and deleted status
   * @param email - User's email (case sensitive)
   * @param options - Include password and/or deleted users flags
   * @returns User document or null
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
   * Update user profile data
   * @param userId - User's MongoDB ID
   * @param user - Updated user data
   * @param deletedAt - Allow updating deleted users
   * @returns Updated user or null
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
   * Update user avatar directly (separate from profile updates for security)
   * @param userId - User's MongoDB ID
   * @param avatarUrl - New avatar URL
   * @returns Updated user or null
   */
  async updateUserAvatar(
    userId: string,
    avatarUrl: string
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    return await User.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { avatar: avatarUrl },
      { new: true }
    );
  }

  /**
   * Change user password with old password verification
   * @param userId - User's MongoDB ID
   * @param password - Old and new password pair
   * @returns Updated user or null if verification fails
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
   * Admin: Set user password directly without verification
   * @param userId - User's MongoDB ID
   * @param newPassword - New password to set
   * @returns Updated user or null
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
   * Update user's refresh token
   * @param userId - User's MongoDB ID
   * @param tokenData - New refresh token data
   * @returns Updated user or null
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
   * Set new refresh token and return with token field
   * @param userId - User's MongoDB ID
   * @param refreshToken - New refresh token
   * @returns Updated user with token or null
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
   * Remove user's refresh token
   * @param userId - User's MongoDB ID
   * @returns Updated user or null
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
   * Admin: Update user's role
   * @param userId - User's MongoDB ID
   * @param role - New role to assign
   * @returns Updated user or null
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
   * Soft delete user by setting deletedAt
   * @param userId - User's MongoDB ID
   * @returns Updated user or null
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
   * Restore soft-deleted user
   * @param userId - User's MongoDB ID
   * @returns Restored user or null
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
   * List all users with optional deleted filter
   * @param deletedAt - Filter for deleted users
   * @returns Array of matching users
   */
  async getAllUsers(deletedAt: boolean = false): Promise<IUser[]> {
    return await User.find({
      deletedAt: deletedAt ? { $ne: null } : null,
    });
  }

  /**
   * Admin: Set user's storage limit in bytes
   * @param userId - User's MongoDB ID
   * @param maxStorageLimit - New storage limit
   * @returns Updated user or null
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

  /**
   * Permanently delete user from database (hard delete)
   * @param userId - User's MongoDB ID
   * @returns Deletion result with acknowledged and deletedCount properties
   */
  async permanentDeleteUser(
    userId: string
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { acknowledged: false, deletedCount: 0 };
    }

    const result = await User.deleteOne({ _id: userId });
    return {
      acknowledged: result.acknowledged,
      deletedCount: result.deletedCount,
    };
  }

  /**
   * Get user count for a specific date range
   * @param startDate - Start date for counting users
   * @param endDate - End date for counting users
   * @returns Number of users created in the date range
   */
  async getUserCountByDateRange(startDate: Date, endDate: Date): Promise<number> {
    return await User.countDocuments({
      createdAt: { $gte: startDate, $lt: endDate },
      deletedAt: null
    });
  }

  /**
   * Get active users count (users who uploaded at least one file) for a specific date range
   * @param startDate - Start date for counting active users
   * @param endDate - End date for counting active users
   * @returns Number of active users in the date range
   */
  async getActiveUsersCountByDateRange(startDate: Date, endDate: Date): Promise<number> {
    const result = await User.aggregate([
      {
        $lookup: {
          from: "files",
          localField: "_id",
          foreignField: "owner",
          as: "files"
        }
      },
      {
        $match: {
          deletedAt: null,
          "files.createdAt": { $gte: startDate, $lt: endDate },
          "files.deletedAt": null
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 }
        }
      }
    ]);

    return result[0]?.count || 0;
  }
}

export default new UserDAO();
