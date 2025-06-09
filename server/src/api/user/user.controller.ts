import userService from "@api/user/user.service.js";
import { IS_PRODUCTION, REFRESH_TOKEN_EXPIRY } from "@config/constants.js";
import { ApiError } from "@utils/apiError.utils.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import asyncHandler from "@utils/asyncHandler.utils.js";
import { jwtTimeToMs } from "@utils/jwtTimeToMs.utils.js";
import logger from "@utils/logger.utils.js";
import { Request, Response } from "express";

/**
 * Handle user-related HTTP requests
 */
class UserController {
  cookieOptions = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    maxAge: jwtTimeToMs(REFRESH_TOKEN_EXPIRY),
  };
  /**
   * Register user (no auto-login)
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    // Service handles user creation only, no token generation
    const user = await userService.registerUser(req.body);

    // Return user data without tokens or cookies
    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { user },
          "Registration successful. Please login to continue."
        )
      );
  });

  /**
   * Authenticate user and set session cookies
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await userService.loginUser(
      req.body
    );

    // Return user data and access token
    res
      .status(200)
      .cookie("accessToken", accessToken, this.cookieOptions)
      .cookie("refreshToken", refreshToken, this.cookieOptions)
      .json(new ApiResponse(200, { user, accessToken }, "Login successful"));
  });

  /**
   * Admin: List all users with deleted filter
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    // Extract query parameter for including deleted users
    const includeDeleted = req.query.includeDeleted === "true";

    const users = await userService.getAllUsers(includeDeleted);
    res.json(new ApiResponse(200, { users }, "Users retrieved successfully"));
  });

  /**
   * Get users with pagination, filtering, and search (admin)
   */
  getAllUsersWithPagination = asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      pageSize = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      searchFields,
      filters,
      createdAtStart,
      createdAtEnd
    } = req.query;

    console.log("Query parameters:", {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      searchFields,
      filters,
      createdAtStart,
      createdAtEnd
    });
    // Parse pagination parameters
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    
    // Parse search fields if provided
    const searchFieldsArray = searchFields 
      ? (searchFields as string).split(',').map(field => field.trim())
      : undefined;

    // Parse filters if provided
    let parsedFilters;
    if (filters) {
      try {
        parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
      } catch (error) {
        parsedFilters = {};
      }
    }

    // Build date ranges object from query parameters
    const dateRanges: { createdAtStart?: string; createdAtEnd?: string } = {};
    if (createdAtStart) {
      dateRanges.createdAtStart = createdAtStart as string;
    }
    if (createdAtEnd) {
      dateRanges.createdAtEnd = createdAtEnd as string;
    }

    const result = await userService.getAllUsersWithPagination({
      page: pageNum,
      pageSize: pageSizeNum,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      search: search as string,
      searchFields: searchFieldsArray,
      filters: parsedFilters,
      dateRanges: Object.keys(dateRanges).length > 0 ? dateRanges : undefined
    });

    res.json(new ApiResponse(200, result, "Users retrieved successfully"));
  });

  /**
   * Fetch single user profile
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getUserById(req.params.id);
    res.json(new ApiResponse(200, { user }, "User retrieved successfully"));
  });

  /**
   * Update user profile data
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const updatedUser = await userService.updateUser(req.params.id, req.body);
    res.json(
      new ApiResponse(200, { user: updatedUser }, "User updated successfully")
    );
  });

  /**
   * Change user password with verification
   */
  updateUserPassword = asyncHandler(async (req: Request, res: Response) => {
    const updatedUser = await userService.updateUserPassword(
      req.params.id,
      req.body
    );
    res.json(
      new ApiResponse(
        200,
        { user: updatedUser },
        "Password updated successfully"
      )
    );
  });

  /**
   * Admin: Set user password directly
   */
  adminSetUserPassword = asyncHandler(async (req: Request, res: Response) => {
    const updatedUser = await userService.adminSetUserPassword(
      req.params.id,
      req.body
    );
    res.json(
      new ApiResponse(
        200,
        { user: updatedUser },
        "User password set successfully"
      )
    );
  });

  /**
   * Admin: Change user role
   */
  updateUserRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    // don't allow updating own role for admin
    if (req.user && req.user.id === id) {
      throw new ApiError(403, [{ role: "You cannot update your own role" }]);
    }
    const updatedUser = await userService.updateUserRole(id, req.body);
    
    res.json(
      new ApiResponse(
        200,
        { user: updatedUser },
        "User role updated successfully"
      )
    );
  });



  /**
   * End session and clear cookies
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    try {
      await userService.logoutUser(req.user.id);

      res
        .clearCookie("refreshToken", this.cookieOptions)
        .clearCookie("accessToken", this.cookieOptions)
        .json(new ApiResponse(200, {}, "Logged out successfully"));
    } catch (error) {
      // Clear cookies anyway for security
      res
        .clearCookie("refreshToken", this.cookieOptions)
        .clearCookie("accessToken", this.cookieOptions);

      // Re-throw for error handler
      throw error;
    }
  });

  /**
   * Generate new token pair from refresh token
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    // Try to get token from cookies first, then body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      throw new ApiError(400, [{ refreshToken: "Refresh token is required" }]);
    }

    // Get new tokens using the refresh token
    const { user, newAccessToken, newRefreshToken } =
      await userService.refreshAccessToken(refreshToken);

    // Return user data and set cookies with new tokens
    res
      .status(200)
      .cookie("refreshToken", newRefreshToken, this.cookieOptions)
      .cookie("accessToken", newAccessToken, this.cookieOptions)
      .json(
        new ApiResponse(
          200,
          { user, accessToken: newAccessToken },
          "Access token refreshed"
        )
      );
  });

  /**
   * Get authenticated user profile
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    // req.user is already available from the auth middleware
    res.json(
      new ApiResponse(200, { user: req.user }, "User retrieved successfully")
    );
  });

  /**
   * Update own profile data
   */
  updateCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const updatedUser = await userService.updateUser(req.user.id, req.body);
    res.json(
      new ApiResponse(200, { user: updatedUser }, "User updated successfully")
    );
  });

  /**
   * Change own password
   */
  updateCurrentUserPassword = asyncHandler(
    async (req: Request, res: Response) => {
      if (!req.user) {
        throw new ApiError(401, [{ authentication: "Unauthorized" }]);
      }

      const updatedUser = await userService.updateUserPassword(
        req.user.id,
        req.body
      );
      res.json(
        new ApiResponse(
          200,
          { user: updatedUser },
          "Password updated successfully"
        )
      );
    }
  );

  /**
   * Admin: Set user storage quota
   */
  updateUserStorageLimit = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updatedUser = await userService.updateUserStorageLimit(id, req.body);
    res.json(
      new ApiResponse(
        200,
        { user: updatedUser },
        "User storage limit updated successfully"
      )
    );
  });



  /**
   * Permanently delete current user account
   */
  deleteUserAccount = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    await userService.deleteUserAccount(req.user.id, req.body);
    
    // Clear session cookies after successful deletion
    res
      .status(200)
      .clearCookie("accessToken", {
        httpOnly: true,
        secure: IS_PRODUCTION,
      })
      .clearCookie("refreshToken", {
        httpOnly: true,
        secure: IS_PRODUCTION,
      })
      .json(
        new ApiResponse(
          200,
          null,
          "Account deleted successfully"
        )
      );
  });

  /**
   * Update current user avatar
   */
  updateCurrentUserAvatar = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    if (!req.file) {
      throw new ApiError(400, [{ avatar: "No avatar file uploaded" }]);
    }

    try {
      // Generate the avatar URL that will be stored in the database
      const avatarUrl = `/avatars/${req.file.filename}`;
      
      // Update user avatar in the database
      const updatedUser = await userService.updateUserAvatar(req.user.id, avatarUrl);
      
      res.json(
        new ApiResponse(
          200,
          { user: updatedUser },
          "Avatar updated successfully"
        )
      );
    } catch (error) {
      // Clean up uploaded file if database update fails
      try {
        const { rollbackAvatarUpload } = await import("@middleware/avatar.middleware.js");
        await rollbackAvatarUpload(req);
      } catch (cleanupError) {
        logger.error("Failed to clean up avatar upload:", cleanupError);
      }
      throw error;
    }
  });

  /**
   * Admin: Bulk soft delete users
   */
  bulkSoftDeleteUsers = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const { userIds } = req.body;
    const result = await userService.bulkSoftDeleteUsers(userIds, req.user.id);
    res.json(
      new ApiResponse(
        200,
        result,
        "Users soft deleted successfully"
      )
    );
  });

  /**
   * Admin: Bulk restore users
   */
  bulkRestoreUsers = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const { userIds } = req.body;
    const result = await userService.bulkRestoreUsers(userIds, req.user.id);
    res.json(
      new ApiResponse(
        200,
        result,
        "Users restored successfully"
      )
    );
  });

  /**
   * Admin: Bulk permanent delete users
   */
  bulkPermanentDeleteUsers = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const { userIds } = req.body;
    const result = await userService.bulkPermanentDeleteUsers(userIds, req.user.id);
    res.json(
      new ApiResponse(
        200,
        result,
        "Users permanently deleted successfully"
      )
    );
  });
}

export default new UserController();
