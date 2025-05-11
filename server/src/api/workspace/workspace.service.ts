import { sanitizeDocument } from "@utils/sanitizeDocument.utils.js";
import { CreateWorkspaceDto, WorkspaceResponseDto } from "./workspace.dto.js";
import { IWorkspace } from "./workspace.model.js";
import workspaceDao from "./workspace.dao.js";
import { ApiError } from "@utils/apiError.utils.js";
import folderService from "@api/Folder/folder.service.js";
import { FolderResponseDto } from "@api/Folder/folder.dto.js";

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
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceResponseDto | null> {
    // Check if the workspace belongs to the user
    await this.validateWorkspaceOwnership(workspaceId, userId, "view");
    const workspace = await workspaceDao.getWorkspaceById(workspaceId);
    return workspace ? this.sanitizeWorkspace(workspace) : null;
  }

  async updateWorkspace(
    workspaceId: string,
    userId: string,
    updateData: Partial<CreateWorkspaceDto>
  ): Promise<WorkspaceResponseDto | null> {
    // Check if the workspace belongs to the user
    await this.validateWorkspaceOwnership(workspaceId, userId, "update");

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
    await this.validateWorkspaceOwnership(workspaceId, userId, "delete");

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
    await this.validateWorkspaceOwnership(workspaceId, userId, "rename");

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

  async addFolderToWorkspace(
    workspaceId: string,
    folderId: string,
    userId: string
  ): Promise<FolderResponseDto | null> {
    // Check if the workspace exists and verify ownership
    await this.validateWorkspaceOwnership(workspaceId, userId, "modify");

    // Check if the folder already exists in the workspace
    const folder = await folderService.getFolderById(folderId, userId, true);
    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }
    if (folder.workspace && folder.workspace.toString() === workspaceId) {
      throw new ApiError(409, [{ folder: "Folder already exists in this workspace" }]);
    }

    // Proceed to add folder to workspace
    const updatedfolder = await folderService.updateFolder(
      folderId,
      { workspace: workspaceId },
      userId
    );
    if (!updatedfolder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }
    return updatedfolder;
  }

  async removeFolderFromWorkspace(
    workspaceId: string,
    folderId: string,
    userId: string
  ): Promise<FolderResponseDto | null> {
    // Check if the workspace exists and verify ownership
    await this.validateWorkspaceOwnership(workspaceId, userId, "modify");

    // Check if the folder exists in the workspace
    const folder = await folderService.getFolderById(folderId, userId, true);
    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }
    if (folder.workspace && folder.workspace.toString() !== workspaceId) {
      throw new ApiError(409, [{ folder: "Folder does not belong to this workspace" }]);
    }
    // Proceed to remove folder from workspace
    const updatedFolder = await folderService.updateFolder(
      folderId,
      { workspace: null },
      userId
    );
    if (!updatedFolder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }
    return updatedFolder;
  }

  /**
   * Verifies that a workspace belongs to the specified user
   * 
   * @param workspaceId The ID of the workspace to check
   * @param userId The ID of the user who should own the workspace
   * @param operation Optional description of the operation being performed, for error messaging
   * @returns The workspace if ownership is verified
   * @throws ApiError if workspace not found or user is not the owner
   */
  private async validateWorkspaceOwnership(
    workspaceId: string, 
    userId: string,
    operation: string = "modify"
  ): Promise<IWorkspace> {
    const workspace = await workspaceDao.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new ApiError(404, [{ workspace: "Workspace not found" }]);
    }

    // Check if the workspace belongs to the user
    if (workspace.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: `You do not have permission to ${operation} this workspace` },
      ]);
    }

    return workspace;
  }

  private sanitizeWorkspace(workspace: IWorkspace): WorkspaceResponseDto {
    return sanitizeDocument<WorkspaceResponseDto>(workspace, {
      excludeFields: ["password", "refreshToken", "__v"],
      recursive: true,
    });
  }
}

export default new WorkspaceService();