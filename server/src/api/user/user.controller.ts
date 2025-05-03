import { Request, Response } from "express";
import userService from "./user.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/apiError.js";
import { IS_PRODUCTION, REFRESH_TOKEN_EXPIRY } from "../../constants.js";
import { getMillisecondsFromJwtTime } from "../../utils/authUtils.js";

class UserController {
  cookieOptions = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    maxAge: getMillisecondsFromJwtTime(REFRESH_TOKEN_EXPIRY),
  };
  /**
   * Register a new user and automatically log them in
   */
  register = async (req: Request, res: Response) => {
    // Service handles both user creation and token generation
    const { user, accessToken, refreshToken } = await userService.registerUser(req.body);

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
  };

  /**
   * Login existing user
   */
  login = async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await userService.loginUser(
      req.body
    );

    // Return user data and access token
    res
      .status(200)
      .cookie("accessToken", accessToken, this.cookieOptions)
      .cookie("refreshToken", refreshToken, this.cookieOptions)
      .json(new ApiResponse(200, { user, accessToken }, "Login successful"));
  };

  /**
   * Get all users (admin function)
   */
  getAllUsers = async (req: Request, res: Response) => {
    // Extract query parameter for including deleted users
    const includeDeleted = req.query.includeDeleted === "true";

    const users = await userService.getAllUsers(includeDeleted);
    res.json(new ApiResponse(200, { users }, "Users retrieved successfully"));
  };

  /**
   * Get a user by ID
   */
  getUserById = async (req: Request, res: Response) => {
    const user = await userService.getUserById(req.params.id);
    res.json(new ApiResponse(200, { user }, "User retrieved successfully"));
  };

  /**
   * Update user information
   */
  updateUser = async (req: Request, res: Response) => {
    const updatedUser = await userService.updateUser(req.params.id, req.body);
    res.json(
      new ApiResponse(200, { user: updatedUser }, "User updated successfully")
    );
  };

  /**
   * Update user password
   */
  updateUserPassword = async (req: Request, res: Response) => {
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
  };

  /**
   * Delete a user (soft delete)
   */
  deleteUser = async (req: Request, res: Response) => {
    const deletedUser = await userService.deleteUser(req.params.id);
    res.json(
      new ApiResponse(200, { user: deletedUser }, "User deleted successfully")
    );
  };

  /**
   * Logout user by clearing refresh token
   */
  logout = async (req: Request, res: Response) => {
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
  };
}

export default new UserController();
