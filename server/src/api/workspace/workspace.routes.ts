// filepath: /Users/rayyanbalami/Documents/proj/server/src/api/workspace/workspace.routes.ts
import workspaceController from "@api/workspace/workspace.controller.js";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  renameWorkspaceSchema,
  addFolderToWorkspaceSchema,
} from "@api/workspace/workspace.validator.js";
import { verifyAuth } from "@middleware/auth.middleware.js";
import { validateData } from "@middleware/validate.middleware.js";
import { Router } from "express";

const router = Router();

// Apply authentication middleware to all workspace routes
router.use(verifyAuth);

// Workspace management routes
router
  .post("/", validateData(createWorkspaceSchema), workspaceController.createWorkspace)
  .get("/user/:userId", workspaceController.getWorkspacesByUserId)
  .get("/:id", workspaceController.getWorkspaceById)
  .put("/:id", validateData(updateWorkspaceSchema), workspaceController.updateWorkspace)
  .patch("/:id/rename", validateData(renameWorkspaceSchema), workspaceController.renameWorkspace)
  .delete("/:id", workspaceController.deleteWorkspace)
  // Add new routes for folder management within workspaces
  .post("/:id/folders", validateData(addFolderToWorkspaceSchema), workspaceController.addFolderToWorkspace)
  .delete("/:id/folders/:folderId", workspaceController.removeFolderFromWorkspace);

export default router;
