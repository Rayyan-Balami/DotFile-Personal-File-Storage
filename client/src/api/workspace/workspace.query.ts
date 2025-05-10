import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import workspaceApi from "./workspace.api";
import { CreateWorkspaceDto, UpdateWorkspaceDto, RenameWorkspaceDto } from "@/types/workspace.dto";

// Query keys
export const WORKSPACE_KEYS = {
  all: ["workspaces"] as const,
  byUser: (userId: string) => [...WORKSPACE_KEYS.all, "user", userId] as const,
  detail: (id: string) => [...WORKSPACE_KEYS.all, id] as const,
};

/**
 * Hook to get workspaces for current user
 */
export const useUserWorkspaces = (userId: string) =>
  useQuery({
    queryKey: WORKSPACE_KEYS.byUser(userId),
    queryFn: () => workspaceApi.getWorkspacesByUserId(userId).then((res) => res.data),
    enabled: !!userId,
  });

/**
 * Hook to get a specific workspace by ID
 */
export const useWorkspace = (workspaceId: string) =>
  useQuery({
    queryKey: WORKSPACE_KEYS.detail(workspaceId),
    queryFn: () => workspaceApi.getWorkspaceById(workspaceId).then((res) => res.data),
    enabled: !!workspaceId,
  });

/**
 * Hook to create a new workspace
 */
export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateWorkspaceDto) => 
      workspaceApi.createWorkspace(data).then((res) => res.data),
    onSuccess: (_, variables) => {
      if (variables.userId) {
        queryClient.invalidateQueries({
          queryKey: WORKSPACE_KEYS.byUser(variables.userId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: WORKSPACE_KEYS.all,
      });
    },
  });
};

/**
 * Hook to update workspace properties
 */
export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string, data: UpdateWorkspaceDto }) => 
      workspaceApi.updateWorkspace(workspaceId, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: WORKSPACE_KEYS.detail(variables.workspaceId),
      });
    },
  });
};

/**
 * Hook to rename a workspace
 */
export const useRenameWorkspace = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string, data: RenameWorkspaceDto }) => 
      workspaceApi.renameWorkspace(workspaceId, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: WORKSPACE_KEYS.detail(variables.workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: WORKSPACE_KEYS.all,
      });
    },
  });
};

/**
 * Hook to delete a workspace
 */
export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (workspaceId: string) => 
      workspaceApi.deleteWorkspace(workspaceId).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: WORKSPACE_KEYS.all,
      });
    },
  });
};
