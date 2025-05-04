import { Router } from "express";
import { restrictTo } from "../../middleware/accessControl.middleware.js";
import { verifyAuth } from "../../middleware/auth.middleware.js";
import { verifyGuest } from "../../middleware/guest.middleware.js";
import { validateData } from "../../middleware/validate.middleware.js";
import userController from "./user.controller.js";
import { UserRole } from "./user.dto.js";
import {
  loginUserSchema,
  refreshTokenSchema,
  registerUserSchema,
  updateUserPasswordSchema,
  updateUserSchema,
} from "./user.validator.js";

const userRoutes = Router();

// Public routes (no auth required)
userRoutes.post(
  "/register",
  verifyGuest,
  validateData(registerUserSchema),
  userController.register
);

userRoutes.post(
  "/login",
  verifyGuest,
  validateData(loginUserSchema),
  userController.login
);

userRoutes.post(
  "/refresh-token",
  verifyGuest,
  validateData(refreshTokenSchema),
  userController.refreshToken
);

// Logout route - only for authenticated users
userRoutes.post(
  "/logout",
  verifyAuth,
  restrictTo([UserRole.USER, UserRole.ADMIN]),
  userController.logout
);

// User routes - Admin only can get all users
userRoutes.get(
  "/",
  verifyAuth,
  restrictTo([UserRole.ADMIN]),
  userController.getAllUsers
);

// Get user profile - users can get their own, admin can get any
userRoutes.get(
  "/:id",
  verifyAuth,
  restrictTo([UserRole.USER, UserRole.ADMIN]),
  userController.getUserById
);

// Update user profile - users can update their own, admin can update any
userRoutes.put(
  "/:id",
  verifyAuth,
  restrictTo([UserRole.USER, UserRole.ADMIN]),
  validateData(updateUserSchema),
  userController.updateUser
);

// Update password - users can update their own, admin can update any
userRoutes.patch(
  "/:id/password",
  verifyAuth,
  restrictTo([UserRole.USER, UserRole.ADMIN]),
  validateData(updateUserPasswordSchema),
  userController.updateUserPassword
);

// Delete user - admin only operation
userRoutes.delete(
  "/:id",
  verifyAuth,
  restrictTo([UserRole.ADMIN]),
  userController.deleteUser
);

export default userRoutes;
