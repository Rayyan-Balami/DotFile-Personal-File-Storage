import { Request, Response } from "express";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import planService from "./plan.service.js";

class PlanController {
  /**
   * Get all plans
   */
  getAllPlans = asyncHandler(async (req: Request, res: Response) => {
    // Check if admin is requesting to include deleted plans
    const includeDeleted = req.user?.role === "admin" && req.query.includeDeleted === "true";
    
    const plans = await planService.getAllPlans(includeDeleted);
    res.json(new ApiResponse(200, { plans }, "Plans retrieved successfully"));
  });

  /**
   * Get a plan by ID
   */
  getPlanById = asyncHandler(async (req: Request, res: Response) => {
    const plan = await planService.getPlanById(req.params.id);
    res.json(new ApiResponse(200, { plan }, "Plan retrieved successfully"));
  });

  /**
   * Create a new plan (admin only)
   */
  createPlan = asyncHandler(async (req: Request, res: Response) => {
    const plan = await planService.createPlan(req.body);
    res.status(201).json(new ApiResponse(201, { plan }, "Plan created successfully"));
  });

  /**
   * Update a plan (admin only)
   */
  updatePlan = asyncHandler(async (req: Request, res: Response) => {
    const updatedPlan = await planService.updatePlan(req.params.id, req.body);
    res.json(new ApiResponse(200, { plan: updatedPlan }, "Plan updated successfully"));
  });

  /**
   * Delete a plan (admin only)
   */
  deletePlan = asyncHandler(async (req: Request, res: Response) => {
    const deletedPlan = await planService.deletePlan(req.params.id);
    res.json(new ApiResponse(200, { plan: deletedPlan }, "Plan deleted successfully"));
  });

  /**
   * Subscribe a user to a plan
   */
  subscribeToPlan = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required", ["authentication"]);
    }

    const userId = req.user.id;
    const planId = req.params.planId;
    
    const userPlan = await planService.subscribeToPlan(userId, planId);
    
    res.json(new ApiResponse(200, { plan: userPlan }, "Plan subscription successful"));
  });

  /**
   * Get user's current plan with usage information
   */
  getUserPlan = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required", ["authentication"]);
    }

    const userId = req.user.id;
    const userPlan = await planService.getUserPlan(userId);
    
    res.json(new ApiResponse(200, { plan: userPlan }, "User plan retrieved successfully"));
  });
}

export default new PlanController();