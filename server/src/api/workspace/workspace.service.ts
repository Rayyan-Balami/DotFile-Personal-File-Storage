import { sanitizeDocument } from "@utils/sanitizeDocument.utils.js";
import { CreateWorkspaceDto, WorkspaceResponseDto } from "./workspace.dto.js";
import { IWorkspace } from "./workspace.model.js";
import workspaceDao from "./workspace.dao.js";
import { ApiError } from "@utils/apiError.utils.js";

class WorkspaceService {
  async createWorkspace(
    workspaceData: CreateWorkspaceDto
  ): Promise<WorkspaceResponseDto> {
    // Check if the workspace name already exists for the user
    const existingWorkspace = await workspaceDao.getWorkspaceByName(
      workspaceData.name
    );
    if (existingWorkspace) {
      throw new ApiError(409, [
        { workspace: "Workspace with this name already exists" },
      ]);
    }
    // Proceed to create the workspace
    const newWorkspace = await workspaceDao.createWorkspace(workspaceData);
    return this.sanitizeWorkspace(newWorkspace);
  }

  async getWorkspaceById(
    workspaceId: string
  ): Promise<WorkspaceResponseDto | null> {
    const workspace = await workspaceDao.getWorkspaceById(workspaceId);
    return workspace ? this.sanitizeWorkspace(workspace) : null;
  }

  async updateWorkspace(
    workspaceId: string,
    userId: string,
    updateData: Partial<CreateWorkspaceDto>
  ): Promise<WorkspaceResponseDto | null> {
    // Check if the workspace belongs to the user
    const workspace = await workspaceDao.getWorkspaceById(workspaceId);
    if (!workspace || workspace.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: "You do not have permission to update this workspace" },
      ]);
    }
    // Check if the new name already exists for the user
    if (updateData.name) {
      const existingWorkspace = await workspaceDao.getWorkspaceByName(
        updateData.name
      );
      if (existingWorkspace && existingWorkspace._id.toString() !== workspaceId) {
        throw new ApiError(409, [
          { workspace: "Workspace with this name already exists" },
        ]);
      }
    }
    // Proceed to update the workspace
    const updatedWorkspace = await workspaceDao.updateWorkspace(
      workspaceId,
      updateData
    );
    return updatedWorkspace ? this.sanitizeWorkspace(updatedWorkspace) : null;
  }

  async deleteWorkspace(workspaceId: string,
    userId: string): Promise<WorkspaceResponseDto | null> {
    // Check if the workspace belongs to the user
    const workspace = await workspaceDao.getWorkspaceById(workspaceId);
    if (!workspace || workspace.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: "You do not have permission to delete this workspace" },
      ]);
    }
    // Proceed to delete the workspace
    const deletedWorkspace = await workspaceDao.deleteWorkspace(workspaceId);
    return deletedWorkspace ? this.sanitizeWorkspace(deletedWorkspace) : null;
  }

  async getWorkspacesByUserId(
    userId: string
  ): Promise<WorkspaceResponseDto[]> {
    const workspaces = await workspaceDao.getWorkspacesByUserId(userId);
    return workspaces.map((workspace) => this.sanitizeWorkspace(workspace));
  }

  async renameWorkspace(
    workspaceId: string,
    userId: string,
    newName: string
  ): Promise<WorkspaceResponseDto | null> {
    // Check if the workspace belongs to the user
    const workspace = await workspaceDao.getWorkspaceById(workspaceId);
    if (!workspace || workspace.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: "You do not have permission to rename this workspace" },
      ]);
    }
    // Rename the workspace
    // Check if the new name already exists for the user
    const existingWorkspace = await workspaceDao.getWorkspaceByName(newName);
    if (existingWorkspace) {
      throw new ApiError(409, [{ workspace: "Workspace with this name already exists" }]);
    }
    // Proceed to rename the workspace
    const renamedWorkspace = await workspaceDao.renameWorkspace(
      workspaceId,
      newName
    );
    return renamedWorkspace ? this.sanitizeWorkspace(renamedWorkspace) : null;
  }

  private sanitizeWorkspace(workspace: IWorkspace): WorkspaceResponseDto {
    return sanitizeDocument<WorkspaceResponseDto>(workspace, {
      excludeFields: ["password", "refreshToken", "__v"],
      recursive: true,
    });
  }
}


export default new WorkspaceService();