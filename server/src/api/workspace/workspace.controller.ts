// filepath: /Users/rayyanbalami/Documents/proj/server/src/api/workspace/workspace.controller.ts
import workspaceService from "@api/workspace/workspace.service.js";
import { ApiError } from "@utils/apiError.utils.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import asyncHandler from "@utils/asyncHandler.utils.js";
import { Request, Response } from "express";

class WorkspaceController {
  /**
   * Create a new workspace
   */
  createWorkspace = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    
    const workspaceData = { ...req.body, owner: req.user.id };
    const workspace = await workspaceService.createWorkspace(workspaceData);
    
    res.status(201).json(new ApiResponse(201, { workspace }, "Workspace created successfully"));
  });

  /**
   * Get workspace by ID
   */
  getWorkspaceById = asyncHandler(async (req: Request, res: Response) => {
    const workspace = await workspaceService.getWorkspaceById(req.params.id);
    if (!workspace) throw new ApiError(404, [{ workspace: "Workspace not found" }]);
    
    res.json(new ApiResponse(200, { workspace }, "Workspace retrieved successfully"));
  });

  /**
   * Update workspace details
   */
  updateWorkspace = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    
    const updatedWorkspace = await workspaceService.updateWorkspace(
      req.params.id,
      req.user.id,
      req.body
    );
    
    if (!updatedWorkspace) throw new ApiError(404, [{ workspace: "Workspace not found" }]);
    
    res.json(new ApiResponse(200, { workspace: updatedWorkspace }, "Workspace updated successfully"));
  });

  /**
   * Delete a workspace
   */
  deleteWorkspace = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    
    const deletedWorkspace = await workspaceService.deleteWorkspace(
      req.params.id,
      req.user.id
    );
    
    if (!deletedWorkspace) throw new ApiError(404, [{ workspace: "Workspace not found" }]);
    
    res.json(new ApiResponse(200, { workspace: deletedWorkspace }, "Workspace deleted successfully"));
  });

  /**
   * Get workspaces for a user
   */
  getWorkspacesByUserId = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    
    const userId = req.params.userId || req.user.id;
    const workspaces = await workspaceService.getWorkspacesByUserId(userId);
    
    res.json(new ApiResponse(200, { workspaces }, "Workspaces retrieved successfully"));
  });

  /**
   * Rename workspace
   */
  renameWorkspace = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    const { newName } = req.body;
    
    if (!newName) throw new ApiError(400, [{ newName: "New workspace name is required" }]);
    
    const renamedWorkspace = await workspaceService.renameWorkspace(
      req.params.id,
      req.user.id,
      newName
    );
    
    if (!renamedWorkspace) throw new ApiError(404, [{ workspace: "Workspace not found" }]);
    
    res.json(new ApiResponse(200, { workspace: renamedWorkspace }, "Workspace renamed successfully"));
  });
}

export default new WorkspaceController();
