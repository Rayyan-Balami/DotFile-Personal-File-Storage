import userService from "@api/user/user.service.js";
import { IS_PRODUCTION, REFRESH_TOKEN_EXPIRY } from "@config/constants.js";
import { ApiError } from "@utils/apiError.js";
import { ApiResponse } from "@utils/apiResponse.js";
import asyncHandler from "@utils/asyncHandler.js";
import { jwtTimeToMs } from "@utils/jwtTimeToMs.js";
import { Request, Response } from "express";

class UserController {
  cookieOptions = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    maxAge: jwtTimeToMs(REFRESH_TOKEN_EXPIRY),
  };
  /**
   * Register a new user and automatically log them in
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    // Service handles both user creation and token generation
    const { user, accessToken, refreshToken } = await userService.registerUser(
      req.body
    );

    // Return user data and set cookies
    res
      .status(201)
      .cookie("refreshToken", refreshToken, this.cookieOptions)
      .cookie("accessToken", accessToken, this.cookieOptions)
      .json(
        new ApiResponse(
          201,
          { user, accessToken },
          "User registered successfully"
        )
      );
  });

  /**
   * Login existing user
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
   * Get all users (admin function)
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    // Extract query parameter for including deleted users
    const includeDeleted = req.query.includeDeleted === "true";

    const users = await userService.getAllUsers(includeDeleted);
    res.json(new ApiResponse(200, { users }, "Users retrieved successfully"));
  });

  /**
   * Get a user by ID
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getUserById(req.params.id);
    res.json(new ApiResponse(200, { user }, "User retrieved successfully"));
  });

  /**
   * Update user information
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const updatedUser = await userService.updateUser(req.params.id, req.body);
    res.json(
      new ApiResponse(200, { user: updatedUser }, "User updated successfully")
    );
  });

  /**
   * Update user password
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
   * Delete a user (soft delete)
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const deletedUser = await userService.deleteUser(req.params.id);
    res.json(
      new ApiResponse(200, { user: deletedUser }, "User deleted successfully")
    );
  });

  /**
   * Logout user by clearing refresh token
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
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
   * Refresh access token using refresh token
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    // Try to get token from cookies first, then body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      throw new ApiError(400, "Refresh token is required", ["refreshToken"]);
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
   * Get the current authenticated user's profile
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    // req.user is already available from the auth middleware
    res.json(
      new ApiResponse(200, { user: req.user }, "User retrieved successfully")
    );
  });

  /**
   * Update the current authenticated user's profile
   */
  updateCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }

    const updatedUser = await userService.updateUser(req.user.id, req.body);
    res.json(
      new ApiResponse(200, { user: updatedUser }, "User updated successfully")
    );
  });

  /**
   * Update the current authenticated user's password
   */
  updateCurrentUserPassword = asyncHandler(
    async (req: Request, res: Response) => {
      if (!req.user) {
        throw new ApiError(401, "Unauthorized", ["authentication"]);
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
}

export default new UserController();
