import { Router } from "express";
import planController from "@api/plan/plan.controller.js";
import {
  createPlanSchema,
  updatePlanSchema,
} from "@api/plan/plan.validator.js";
import { UserRole } from "@api/user/user.dto.js";
import { restrictTo } from "@middleware/accessControl.middleware.js";
import { verifyAuth } from "@middleware/auth.middleware.js";
import { validateData } from "@middleware/validate.middleware.js";

//=============================================================================
// ROUTE INITIALIZATION
//=============================================================================
const publicPlanRoutes = Router();
const authPlanRoutes = Router();
const adminPlanRoutes = Router();

//=============================================================================
// PUBLIC ROUTES - No authentication required
//=============================================================================
// Anyone can view available plans
publicPlanRoutes
  .get("/", planController.getAllPlans)
  .get("/:id", planController.getPlanById);

//=============================================================================
// AUTHENTICATED USER ROUTES - Requires valid auth token
//=============================================================================
// Apply middleware once at the router level
authPlanRoutes.use(verifyAuth);

authPlanRoutes
  .post("/subscribe/:planId", planController.subscribeToPlan)
  .get("/my-plan", planController.getUserPlan);

//=============================================================================
// ADMIN ROUTES - Requires admin privileges
//=============================================================================
// Apply middleware once at the router level
adminPlanRoutes.use(verifyAuth);
adminPlanRoutes.use(restrictTo([UserRole.ADMIN]));

adminPlanRoutes
  .post(
    "/",
    validateData(createPlanSchema),
    planController.createPlan
  )
  .put(
    "/:id",
    validateData(updatePlanSchema),
    planController.updatePlan
  )
  .delete("/:id", planController.deletePlan);

//=============================================================================
// ROUTE REGISTRATION
//=============================================================================
const planRoutes = Router();
planRoutes.use("/plans", publicPlanRoutes);
planRoutes.use("/plans", authPlanRoutes);
planRoutes.use("/admin/plans", adminPlanRoutes);

export default planRoutes;
