import { Router } from "express";
import { restrictTo } from "../../middleware/accessControl.middleware.js";
import { verifyAuth } from "../../middleware/auth.middleware.js";
import { validateData } from "../../middleware/validate.middleware.js";
import { UserRole } from "../user/user.dto.js";
import planController from "./plan.controller.js";
import { createPlanSchema, updatePlanSchema } from "./plan.validator.js";

const planRoutes = Router();

// Public routes - anyone can view available plans
planRoutes.get("/", planController.getAllPlans);
planRoutes.get("/:id", planController.getPlanById);

// Protected routes - require authentication
planRoutes.post("/subscribe/:planId", verifyAuth, planController.subscribeToPlan);
planRoutes.get("/my-plan", verifyAuth, planController.getUserPlan);

// Admin only routes
planRoutes.post(
  "/",
  verifyAuth,
  restrictTo([UserRole.ADMIN]),
  validateData(createPlanSchema),
  planController.createPlan
);

planRoutes.put(
  "/:id",
  verifyAuth,
  restrictTo([UserRole.ADMIN]),
  validateData(updatePlanSchema),
  planController.updatePlan
);

planRoutes.delete(
  "/:id",
  verifyAuth,
  restrictTo([UserRole.ADMIN]),
  planController.deletePlan
);

export default planRoutes;