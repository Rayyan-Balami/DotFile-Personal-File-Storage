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
   * Get users with pagination, sorting, filtering, and search
   * @param options - Pagination and filtering options
   * @returns Paginated user results with metadata
   */
  async getAllUsersWithPagination(options: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    searchFields?: string[];
    filters?: {
      role?: string;
      status?: 'active' | 'deleted';
      includeDeleted?: boolean;
    };
    dateRanges?: {
      createdAtStart?: string;
      createdAtEnd?: string;
    };
  }): Promise<{
    users: IUser[];
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const {
      page,
      pageSize,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      searchFields = ['name', 'email'],
      filters = {},
      dateRanges = {}
    } = options;

    // Build match stage for aggregation
    const matchStage: any = {};

    // Handle deleted users filter
    if (filters.status === 'deleted') {
      matchStage.deletedAt = { $ne: null };
    } else if (filters.status === 'active') {
      matchStage.deletedAt = null;
    } else if (!filters.includeDeleted) {
      matchStage.deletedAt = null;
    }

    // Handle role filter
    if (filters.role) {
      matchStage.role = filters.role;
    }

    // Handle date range filtering for createdAt
    if (dateRanges.createdAtStart || dateRanges.createdAtEnd) {
      matchStage.createdAt = {};
      
      if (dateRanges.createdAtStart) {
        const startDate = new Date(dateRanges.createdAtStart);
        matchStage.createdAt.$gte = startDate;
      }
      
      if (dateRanges.createdAtEnd) {
        const endDate = new Date(dateRanges.createdAtEnd);
        // Add 23:59:59.999 to include the entire end date
        endDate.setHours(23, 59, 59, 999);
        matchStage.createdAt.$lte = endDate;
      }
    }

    // Handle search
    if (search && searchFields.length > 0) {
      const searchRegex = new RegExp(search, 'i');
      matchStage.$or = searchFields.map(field => ({
        [field]: searchRegex
      }));
    }

    // Build sort stage
    const sortStage: any = {};
    sortStage[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate skip value
    const skip = (page - 1) * pageSize;

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchStage },
      {
        $facet: {
          data: [
            { $sort: sortStage },
            { $skip: skip },
            { $limit: pageSize }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ];

    const result = await User.aggregate(pipeline);
    const users = result[0].data;
    const totalItems = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      users,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
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

  /**
   * Get user storage consumption distribution
   * @returns Array of storage consumption categories with user counts
   */
  async getUserStorageConsumption(): Promise<{ category: string; count: number }[]> {
    const result = await User.aggregate([
      {
        $addFields: {
          storagePercentage: {
            $cond: {
              if: { $eq: ["$maxStorageLimit", 0] },
              then: 0,
              else: {
                $multiply: [
                  { $divide: ["$storageUsed", "$maxStorageLimit"] },
                  100
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          category: {
            $switch: {
              branches: [
                { case: { $eq: ["$storagePercentage", 0] }, then: "0%" },
                { case: { $and: [{ $gt: ["$storagePercentage", 0] }, { $lte: ["$storagePercentage", 25] }] }, then: "25%" },
                { case: { $and: [{ $gt: ["$storagePercentage", 25] }, { $lte: ["$storagePercentage", 50] }] }, then: "50%" },
                { case: { $and: [{ $gt: ["$storagePercentage", 50] }, { $lte: ["$storagePercentage", 75] }] }, then: "75%" },
                { case: { $gt: ["$storagePercentage", 75] }, then: "100%" }
              ],
              default: "0%"
            }
          }
        }
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          count: 1
        }
      },
      {
        $sort: {
          category: 1
        }
      }
    ]);

    return result;
  }

  /**
   * Get user registrations by month for the current year
   * @returns Array of monthly user registration counts for current year
   */
  async getMonthlyUserRegistrations(): Promise<{ month: string; count: number }[]> {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);

    const result = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear, $lt: endOfYear },
          deletedAt: null
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          monthNumber: "$_id",
          count: 1
        }
      },
      {
        $sort: { monthNumber: 1 }
      }
    ]);

    // Create a complete array with all 12 months (abbreviated)
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const completeResult = months.map((month, index) => {
      const existingMonth = result.find(item => item.monthNumber === index + 1);
      return {
        month,
        count: existingMonth ? existingMonth.count : 0
      };
    });

    return completeResult;
  }

  /**
   * Bulk soft delete users by setting deletedAt
   * @param userIds - Array of user MongoDB IDs
   * @returns Object with success and failed operations
   */
  async bulkSoftDeleteUsers(userIds: string[]): Promise<{
    successful: IUser[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: IUser[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    // Validate all IDs first
    const validIds: string[] = [];
    for (const userId of userIds) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        failed.push({ id: userId, error: "Invalid user ID format" });
      } else {
        validIds.push(userId);
      }
    }

    if (validIds.length === 0) {
      return { successful, failed };
    }

    try {
      // Use bulkWrite for atomic operations
      const bulkOps = validIds.map(userId => ({
        updateOne: {
          filter: { _id: userId, deletedAt: null },
          update: { deletedAt: new Date() }
        }
      }));

      const bulkResult = await User.bulkWrite(bulkOps);
      
      // Get the successfully updated users
      if (bulkResult.modifiedCount > 0) {
        const updatedUsers = await User.find({
          _id: { $in: validIds },
          deletedAt: { $ne: null }
        });
        successful.push(...updatedUsers);
      }

      // Identify failed operations
      const successfulIds = successful.map(user => user._id.toString());
      const failedIds = validIds.filter(id => !successfulIds.includes(id));
      
      for (const failedId of failedIds) {
        failed.push({ id: failedId, error: "User not found or already deleted" });
      }

    } catch (error) {
      // If bulk operation fails, fall back to marking all as failed
      for (const userId of validIds) {
        failed.push({ id: userId, error: "Database operation failed" });
      }
    }

    return { successful, failed };
  }

  /**
   * Bulk restore soft-deleted users
   * @param userIds - Array of user MongoDB IDs
   * @returns Object with success and failed operations
   */
  async bulkRestoreUsers(userIds: string[]): Promise<{
    successful: IUser[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: IUser[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    // Validate all IDs first
    const validIds: string[] = [];
    for (const userId of userIds) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        failed.push({ id: userId, error: "Invalid user ID format" });
      } else {
        validIds.push(userId);
      }
    }

    if (validIds.length === 0) {
      return { successful, failed };
    }

    try {
      // Use bulkWrite for atomic operations
      const bulkOps = validIds.map(userId => ({
        updateOne: {
          filter: { _id: userId, deletedAt: { $ne: null } },
          update: { deletedAt: null }
        }
      }));

      const bulkResult = await User.bulkWrite(bulkOps);
      
      // Get the successfully updated users
      if (bulkResult.modifiedCount > 0) {
        const updatedUsers = await User.find({
          _id: { $in: validIds },
          deletedAt: null
        });
        successful.push(...updatedUsers);
      }

      // Identify failed operations
      const successfulIds = successful.map(user => user._id.toString());
      const failedIds = validIds.filter(id => !successfulIds.includes(id));
      
      for (const failedId of failedIds) {
        failed.push({ id: failedId, error: "User not found or not deleted" });
      }

    } catch (error) {
      // If bulk operation fails, fall back to marking all as failed
      for (const userId of validIds) {
        failed.push({ id: userId, error: "Database operation failed" });
      }
    }

    return { successful, failed };
  }

  /**
   * Bulk permanently delete users from database
   * @param userIds - Array of user MongoDB IDs
   * @returns Object with success and failed operations
   */
  async bulkPermanentDeleteUsers(userIds: string[]): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    // Validate all IDs first
    const validIds: string[] = [];
    for (const userId of userIds) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        failed.push({ id: userId, error: "Invalid user ID format" });
      } else {
        validIds.push(userId);
      }
    }

    if (validIds.length === 0) {
      return { successful, failed };
    }

    try {
      // First, get all users that exist to track which ones we can delete
      const existingUsers = await User.find({
        _id: { $in: validIds }
      }).select('_id');

      const existingIds = existingUsers.map(user => user._id.toString());

      // Mark non-existing users as failed
      for (const userId of validIds) {
        if (!existingIds.includes(userId)) {
          failed.push({ id: userId, error: "User not found" });
        }
      }

      // Delete existing users
      if (existingIds.length > 0) {
        const deleteResult = await User.deleteMany({
          _id: { $in: existingIds }
        });

        if (deleteResult.acknowledged) {
          successful.push(...existingIds);
        } else {
          // If delete operation failed, mark all as failed
          for (const userId of existingIds) {
            failed.push({ id: userId, error: "Failed to delete from database" });
          }
        }
      }

    } catch (error) {
      // If bulk operation fails, fall back to marking all as failed
      for (const userId of validIds) {
        failed.push({ id: userId, error: "Database operation failed" });
      }
    }

    return { successful, failed };
  }
}

export default new UserDAO();
