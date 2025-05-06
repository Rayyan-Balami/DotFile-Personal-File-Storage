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
const guestUserRoutes = Router();
const authUserRoutes = Router();
const adminUserRoutes = Router();

//=============================================================================
// GUEST ROUTES - No authentication required
//=============================================================================
// Apply middleware once at the router level
guestUserRoutes.use(verifyGuest);

guestUserRoutes
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
authUserRoutes.use(verifyAuth);

authUserRoutes
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
adminUserRoutes.use(verifyAuth);
adminUserRoutes.use(restrictTo([UserRole.ADMIN]));

adminUserRoutes
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
userRoutes.use("/auth", guestUserRoutes);
userRoutes.use("/users", authUserRoutes);
userRoutes.use("/admin/users", adminUserRoutes);

export default userRoutes;
