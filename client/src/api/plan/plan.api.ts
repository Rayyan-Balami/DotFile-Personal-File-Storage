import API from "@/lib/axios";
import { CreatePlanDto, UpdatePlanDto } from "@/types/plan.dto";

/**
 * Plan API functions for public, authenticated, and admin use
 */
const planApi = {
  // PUBLIC ENDPOINTS - No authentication required
  getAllPlans: () => 
    API.get("/plans"),

  getPlanById: (planId: string) => 
    API.get(`/plans/${planId}`),

  // AUTH ENDPOINTS - Requires valid auth token
  subscribeToPlan: (planId: string) => 
    API.post(`/plans/subscribe/${planId}`),

  getUserPlan: () => 
    API.get("/plans/my-plan"),

  // ADMIN ENDPOINTS - Requires admin privileges
  createPlan: (data: CreatePlanDto) => 
    API.post("/admin/plans", data),

  updatePlan: (planId: string, data: UpdatePlanDto) => 
    API.put(`/admin/plans/${planId}`, data),

  deletePlan: (planId: string) => 
    API.delete(`/admin/plans/${planId}`)
};

export default planApi;
