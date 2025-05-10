import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import planApi from "./plan.api";
import { CreatePlanDto, UpdatePlanDto } from "@/types/plan.dto";

// Query keys
export const PLAN_KEYS = {
  all: ["plans"] as const,
  detail: (id: string) => [...PLAN_KEYS.all, id] as const,
  userPlan: ["user-plan"] as const,
};

// ==========================
// PUBLIC PLAN HOOKS
// ==========================

/**
 * Hook to get all available plans
 */
export const useAllPlans = () =>
  useQuery({
    queryKey: PLAN_KEYS.all,
    queryFn: () => planApi.getAllPlans().then((res) => res.data),
  });

/**
 * Hook to get a specific plan by ID
 */
export const usePlanById = (planId: string) =>
  useQuery({
    queryKey: PLAN_KEYS.detail(planId),
    queryFn: () => planApi.getPlanById(planId).then((res) => res.data),
    enabled: !!planId,
  });

// ==========================
// AUTH PLAN HOOKS
// ==========================

/**
 * Hook to subscribe to a plan
 */
export const useSubscribeToPlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (planId: string) => 
      planApi.subscribeToPlan(planId).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PLAN_KEYS.userPlan,
      });
      queryClient.invalidateQueries({
        queryKey: ["currentUser"], // Also invalidate user data since plan changed
      });
    },
  });
};

/**
 * Hook to get the current user's plan with usage info
 */
export const useUserPlan = () =>
  useQuery({
    queryKey: PLAN_KEYS.userPlan,
    queryFn: () => planApi.getUserPlan().then((res) => res.data),
  });

// ==========================
// ADMIN PLAN HOOKS
// ==========================

/**
 * Hook to create a new plan (admin only)
 */
export const useCreatePlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreatePlanDto) => 
      planApi.createPlan(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PLAN_KEYS.all,
      });
    },
  });
};

/**
 * Hook to update a plan (admin only)
 */
export const useUpdatePlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ planId, data }: { planId: string, data: UpdatePlanDto }) => 
      planApi.updatePlan(planId, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: PLAN_KEYS.detail(variables.planId),
      });
      queryClient.invalidateQueries({
        queryKey: PLAN_KEYS.all,
      });
    },
  });
};

/**
 * Hook to delete a plan (admin only)
 */
export const useDeletePlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (planId: string) => 
      planApi.deletePlan(planId).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PLAN_KEYS.all,
      });
    },
  });
};
