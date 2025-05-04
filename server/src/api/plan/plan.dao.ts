import mongoose from "mongoose";
import { CreatePlanDTO, UpdatePlanDTO } from "./plan.dto.js";
import Plan, { IPlan } from "./plan.model.js";

/**
 * Data Access Object for Plan operations
 * Handles all database interactions related to plans
 */
export class PlanDAO {
  /**
   * Create a new plan in the database
   *
   * @param plan - Plan data conforming to CreatePlanDTO
   * @returns Newly created plan document with all fields
   */
  async createPlan(plan: CreatePlanDTO): Promise<IPlan> {
    const newPlan = new Plan(plan);
    return await newPlan.save();
  }

  /**
   * Find a plan by its ID
   *
   * @param id - MongoDB ObjectId string of the plan
   * @param includeDeleted - When true, includes soft-deleted plans in search
   * @returns Plan document if found, null otherwise
   */
  async getPlanById(
    id: string,
    includeDeleted: boolean = false
  ): Promise<IPlan | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Plan.findOne({
      _id: id,
      ...(includeDeleted ? {} : { deletedAt: null }),
    });
  }

  /**
   * Find a plan by its name
   *
   * @param name - Plan name (case sensitive)
   * @param includeDeleted - When true, includes soft-deleted plans in search
   * @returns Plan document if found, null otherwise
   */
  async getPlanByName(
    name: string,
    includeDeleted: boolean = false
  ): Promise<IPlan | null> {
    return await Plan.findOne({
      name,
      ...(includeDeleted ? {} : { deletedAt: null }),
    });
  }

  /**
   * Find the current default plan
   * 
   * @param includeDeleted - When true, includes soft-deleted plans in search
   * @returns Default plan document if found, null otherwise
   */
  async getDefaultPlan(
    includeDeleted: boolean = false
  ): Promise<IPlan | null> {
    return await Plan.findOne({
      isDefault: true,
      ...(includeDeleted ? {} : { deletedAt: null }),
    });
  }

  /**
   * Update a plan's information
   *
   * @param id - MongoDB ObjectId string of the plan
   * @param plan - Update data conforming to UpdatePlanDTO
   * @param includeDeleted - When true, allows updating soft-deleted plans
   * @returns Updated plan document if found and updated, null otherwise
   */
  async updatePlan(
    id: string,
    plan: UpdatePlanDTO,
    includeDeleted: boolean = false
  ): Promise<IPlan | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Plan.findOneAndUpdate(
      { _id: id, ...(includeDeleted ? {} : { deletedAt: null }) },
      plan,
      { new: true }
    );
  }

  /**
   * Soft delete a plan by setting deletedAt timestamp
   *
   * @param id - MongoDB ObjectId string of the plan
   * @returns Updated plan document with deletedAt timestamp if successful, null otherwise
   */
  async deletePlan(id: string): Promise<IPlan | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Plan.findOneAndUpdate(
      { _id: id },
      { deletedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Get all plans, optionally filtering for active or deleted plans
   *
   * @param includeDeleted - When true, returns only soft-deleted plans; when false, returns only active plans
   * @returns Array of plan documents matching the criteria
   */
  async getAllPlans(includeDeleted: boolean = false): Promise<IPlan[]> {
    return await Plan.find({
      ...(includeDeleted ? {} : { deletedAt: null }),
    }).sort({ price: 1 }); // Sort plans by price, lowest first
  }
}

export default new PlanDAO();