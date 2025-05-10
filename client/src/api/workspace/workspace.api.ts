import API from "@/lib/axios";
import { CreateWorkspaceDto, UpdateWorkspaceDto, RenameWorkspaceDto } from "@/types/workspace.dto";

/**
 * Workspace API functions for authenticated users
 */
const workspaceApi = {
  // Create a new workspace
  createWorkspace: (data: CreateWorkspaceDto) => 
    API.post("/workspaces", data),

  // Get workspaces for a specific user
  getWorkspacesByUserId: (userId: string) => 
    API.get(`/workspaces/user/${userId}`),

  // Get a specific workspace by ID
  getWorkspaceById: (workspaceId: string) => 
    API.get(`/workspaces/${workspaceId}`),

  // Update a workspace's properties
  updateWorkspace: (workspaceId: string, data: UpdateWorkspaceDto) => 
    API.put(`/workspaces/${workspaceId}`, data),

  // Rename a workspace
  renameWorkspace: (workspaceId: string, data: RenameWorkspaceDto) => 
    API.patch(`/workspaces/${workspaceId}/rename`, data),

  // Delete a workspace
  deleteWorkspace: (workspaceId: string) => 
    API.delete(`/workspaces/${workspaceId}`)
};

export default workspaceApi;
