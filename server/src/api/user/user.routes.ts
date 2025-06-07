import { Router } from "express";
import userController from "@api/user/user.controller.js";
import { UserRole } from "@api/user/user.dto.js";
import {
  adminSetPasswordSchema,
  deleteUserAccountSchema,
  loginUserSchema,
  refreshTokenSchema,
  registerUserSchema,
  updateStorageLimitSchema,
  updateUserPasswordSchema,
  updateUserRoleSchema,
  updateUserSchema,
} from "@api/user/user.validator.js";
import { verifyGuest } from "@middleware/guest.middleware.js";
import { verifyAuth } from "@middleware/auth.middleware.js";
import { restrictTo } from "@middleware/accessControl.middleware.js";
import { validateData } from "@middleware/validate.middleware.js";
import { avatarUpload } from "@middleware/avatar.middleware.js";

//=========================//
// Guest routes (/auth)
//=========================//
const guestRoutes = Router();
guestRoutes.use(verifyGuest);

guestRoutes
  .post("/register", validateData(registerUserSchema), userController.register)     // Register new user
  .post("/login", validateData(loginUserSchema), userController.login)              // Login user
  .post("/refresh-token", validateData(refreshTokenSchema), userController.refreshToken); // Refresh token

//=========================//
// Auth routes (/users) for both user and admin
//=========================//
const authRoutes = Router();
authRoutes.use(verifyAuth);

authRoutes
  .get("/me", userController.getCurrentUser)                                        // Get current user profile
  .put("/me", validateData(updateUserSchema), userController.updateCurrentUser)     // Update profile
  .patch("/me/password", validateData(updateUserPasswordSchema), userController.updateCurrentUserPassword) // Update password
  .patch("/me/avatar", avatarUpload, userController.updateCurrentUserAvatar) // Update avatar
  .delete("/me", validateData(deleteUserAccountSchema), userController.deleteUserAccount) // Delete account
  .post("/logout", userController.logout);                                          // Logout

//=========================//
// Admin routes (/admin/users)
//=========================//
const adminRoutes = Router();
adminRoutes.use(verifyAuth);
adminRoutes.use(restrictTo([UserRole.ADMIN]));

adminRoutes
  .get("/", userController.getAllUsers)                                             // List all users
  .get("/:id", userController.getUserById)                                          // Get user by ID
  .put("/:id", validateData(updateUserSchema), userController.updateUser)           // Update user profile
  .patch("/:id/password", validateData(adminSetPasswordSchema), userController.adminSetUserPassword) // Set password
  .patch("/:id/role", validateData(updateUserRoleSchema), userController.updateUserRole)             // Change role
  .patch("/:id/storage", validateData(updateStorageLimitSchema), userController.updateUserStorageLimit) // Update storage
  .delete("/:id", userController.softDeleteUser)                                    // Soft delete user
  .post("/:id/restore", userController.restoreUser);                                // Restore deleted user

//=========================//
// Main router
//=========================//
const userRoutes = Router();
userRoutes.use("/auth", guestRoutes);            // Public (guest-only)
userRoutes.use("/users", authRoutes);            // Authenticated users
userRoutes.use("/admin/users", adminRoutes);     // Admin only

export default userRoutes;
