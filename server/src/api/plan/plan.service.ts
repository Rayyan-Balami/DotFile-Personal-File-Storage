import planDAO from "@api/plan/plan.dao.js";
import {
  CreatePlanDTO,
  PlanResponseDTO,
  UpdatePlanDTO,
  UserPlanResponseDTO,
} from "@api/plan/plan.dto.js";
import { IPlan } from "@api/plan/plan.model.js";
import userService from "@api/user/user.service.js";
import { ApiError } from "@utils/apiError.utils.js";
import { sanitizeDocument } from "@utils/sanitizeDocument.utils.js";

/**
 * Service class for plan-related business logic
 * Handles operations between controllers and data access layer
 */
class PlanService {
  /**
   * Create a new plan
   *
   * @param data Plan creation data
   * @returns Newly created plan data
   */
  async createPlan(data: CreatePlanDTO): Promise<PlanResponseDTO> {
    // Check if a plan with the same name already exists
    const existingPlan = await planDAO.getPlanByName(data.name);
    if (existingPlan) {
      throw new ApiError(409, [{ name: "Plan with this name already exists" }]);
    }

    // If creating a default plan, unset default flag on any existing default plan
    if (data.isDefault) {
      await this.unsetDefaultPlan();
    }

    const plan = await planDAO.createPlan(data);
    return this.sanitizePlan(plan);
  }

  /**
   * Get a plan by ID
   *
   * @param id Plan ID
   * @returns Plan data if found
   * @throws ApiError if plan not found
   */
  async getPlanById(id: string): Promise<PlanResponseDTO> {
    const plan = await planDAO.getPlanById(id);
    if (!plan) {
      throw new ApiError(404, [ {id: "Plan not found" }]);
    }

    return this.sanitizePlan(plan);
  }

  /**
   * Get a plan by name
   *
   * @param name Plan name
   * @returns Plan data if found
   * @throws ApiError if plan not found
   */
  async getPlanByName(name: string): Promise<PlanResponseDTO> {
    const plan = await planDAO.getPlanByName(name);
    if (!plan) {
      throw new ApiError(404, [ {name: "Plan not found" }]);
    }
    return this.sanitizePlan(plan);
  }

  /**
   * Get the current default plan
   *
   * @returns Default plan data if found
   * @throws ApiError if no default plan found
   */
  async getDefaultPlan(): Promise<PlanResponseDTO> {
    const plan = await planDAO.getDefaultPlan();
    if (!plan) {
      throw new ApiError(404, [ {name: "Default plan not found" }]);
    }
    return this.sanitizePlan(plan);
  }

  /**
   * Get all plans
   *
   * @param includeDeleted Whether to include soft-deleted plans
   * @returns Array of plan data
   */
  async getAllPlans(
    includeDeleted: boolean = false
  ): Promise<PlanResponseDTO[]> {
    const plans = await planDAO.getAllPlans(includeDeleted);
    return plans.map((plan) => this.sanitizePlan(plan));
  }

  /**
   * Update a plan
   *
   * @param id Plan ID
   * @param data Updated plan data
   * @returns Updated plan data
   * @throws ApiError if plan not found
   */
  async updatePlan(id: string, data: UpdatePlanDTO): Promise<PlanResponseDTO> {
    // Check if name is being changed and if it's already in use by another plan
    if (data.name) {
      const existingPlan = await planDAO.getPlanByName(data.name);
      if (existingPlan && existingPlan.id.toString() !== id) {
        throw new ApiError(409, [ {name: "Plan name already in use"} ]);
      }
    }

    // If setting this plan as default, unset default flag on any other plan
    if (data.isDefault) {
      await this.unsetDefaultPlan();
    }

    const updatedPlan = await planDAO.updatePlan(id, data);
    if (!updatedPlan) {
      throw new ApiError(404, [ {id: "Plan not found"} ]);
    }

    return this.sanitizePlan(updatedPlan);
  }

  /**
   * Delete a plan (soft delete)
   *
   * @param id Plan ID
   * @returns Deleted plan data
   * @throws ApiError if plan not found
   */
  async deletePlan(id: string): Promise<PlanResponseDTO> {
    // Check if this is the Free plan - prevent deletion
    const plan = await planDAO.getPlanById(id);
    if (!plan) {
      throw new ApiError(404, [ {id: "Plan not found"} ]);
    }

    if (plan.name === "Free") {
      throw new ApiError(400, [ {name: "Cannot delete the Free plan"} ]);
    }

    const deletedPlan = await planDAO.deletePlan(id);
    if (!deletedPlan) {
      throw new ApiError(404, [ {id: "Plan not found"} ]);
    }

    return this.sanitizePlan(deletedPlan);
  }

  /**
   * Subscribe a user to a plan
   *
   * @param userId User ID
   * @param planId Plan ID
   * @returns Updated user data
   * @throws ApiError if plan or user not found
   */
  async subscribeToPlan(
    userId: string,
    planId: string
  ): Promise<UserPlanResponseDTO> {
    // Verify plan exists
    const plan = await planDAO.getPlanById(planId);
    if (!plan) {
      throw new ApiError(404, [ {id: "Plan not found"} ]);
    }

    // Update user's plan
    const user = await userService.updateUser(userId, { plan: planId });

    // Calculate storage used percentage
    const storagePercentUsed =
      plan.storageLimit > 0
        ? Math.min(
            100,
            Math.round((user.storageUsed / plan.storageLimit) * 100)
          )
        : 0;

    // Combine user and plan data
    return {
      ...this.sanitizePlan(plan),
      storageUsed: user.storageUsed,
      storagePercentUsed,
    };
  }

  /**
   * Get a user's current plan with usage information
   *
   * @param userId User ID
   * @returns Plan data with user usage information
   */
  async getUserPlan(userId: string): Promise<UserPlanResponseDTO> {
    // Get user with populated plan
    const user = await userService.getUserById(userId);

    if (!user.plan) {
      throw new ApiError(404, [ {id: "User plan not found"} ]);
    }

    // Get plan details
    const planId = typeof user.plan === "object" ? user.plan.id : user.plan;
    const plan = await planDAO.getPlanById(planId as string);

    if (!plan) {
      throw new ApiError(404, [ {id: "Plan not found"} ]);
    }

    // Calculate storage used percentage
    const storagePercentUsed =
      plan.storageLimit > 0
        ? Math.min(
            100,
            Math.round((user.storageUsed / plan.storageLimit) * 100)
          )
        : 0;

    // Return plan with usage info
    return {
      ...this.sanitizePlan(plan),
      storageUsed: user.storageUsed,
      storagePercentUsed,
    };
  }

  /**
   * Remove sensitive data from plan object
   *
   * @param plan Plan document
   * @returns Sanitized plan object
   */
  private sanitizePlan(plan: IPlan): PlanResponseDTO {
    return sanitizeDocument<PlanResponseDTO>(plan, {
      excludeFields: ["__v"],
      includeFields: ["id", "name", "storageLimit", "price"], // Only include essential fields
    });
  }

  /**
   * Helper method to unset default flag on any existing default plan
   * @private
   */
  private async unsetDefaultPlan(): Promise<void> {
    const defaultPlan = await planDAO.getDefaultPlan();
    if (defaultPlan) {
      await planDAO.updatePlan(defaultPlan.id, { isDefault: false });
    }
  }
}

export default new PlanService();
