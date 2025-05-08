import userController from "@api/user/user.controller.js";
import { UserRole } from "@api/user/user.dto.js";
import {
  loginUserSchema,
  refreshTokenSchema,
  registerUserSchema,
  updateUserPasswordSchema,
  updateUserSchema,
} from "@api/user/user.validator.js";
import { restrictTo } from "@middleware/accessControl.middleware.js";
import { verifyAuth } from "@middleware/auth.middleware.js";
import { verifyGuest } from "@middleware/guest.middleware.js";
import { validateData } from "@middleware/validate.middleware.js";
import { Router } from "express";

//=============================================================================
// ROUTE INITIALIZATION
//=============================================================================
const guestRoutes = Router();
const authRoutes = Router();
const adminRoutes = Router();

//=============================================================================
// GUEST ROUTES - No authentication required
//=============================================================================
// Apply middleware once at the router level
guestRoutes.use(verifyGuest);

guestRoutes
  .post("/register", validateData(registerUserSchema), userController.register)
  .post("/login", validateData(loginUserSchema), userController.login)
  .post(
    "/refresh-token",
    validateData(refreshTokenSchema),
    userController.refreshToken
  );

//=============================================================================
// AUTHENTICATED USER ROUTES - Requires valid auth token
//=============================================================================
// Apply middleware once at the router level
authRoutes.use(verifyAuth);

authRoutes
  .get("/me", userController.getCurrentUser)
  .put("/me", validateData(updateUserSchema), userController.updateCurrentUser)
  .patch(
    "/me/password",
    validateData(updateUserPasswordSchema),
    userController.updateCurrentUserPassword
  )
  .post("/logout", userController.logout)
  .post("/logout-all", userController.logoutAllDevices);

//=============================================================================
// ADMIN ROUTES - Requires admin privileges
//=============================================================================
// Apply middleware once at the router level
adminRoutes.use(verifyAuth);
adminRoutes.use(restrictTo([UserRole.ADMIN]));

adminRoutes
  .get("/", userController.getAllUsers)
  .get("/:id", userController.getUserById)
  .put("/:id", validateData(updateUserSchema), userController.updateUser)
  .patch(
    "/:id/password",
    validateData(updateUserPasswordSchema),
    userController.updateUserPassword
  )
  .delete("/:id", userController.deleteUser);

//=============================================================================
// ROUTE REGISTRATION
//=============================================================================
const userRoutes = Router();
userRoutes.use("/auth", guestRoutes);
userRoutes.use("/users", authRoutes);
userRoutes.use("/admin/users", adminRoutes);

export default userRoutes;
