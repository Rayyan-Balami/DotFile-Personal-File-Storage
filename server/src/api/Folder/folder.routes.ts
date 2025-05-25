import FolderController from "@api/folder/folder.controller.js";
import {
  createFolderSchema,
  moveFolderSchema,
  renameFolderSchema,
  updateFolderSchema
} from "@api/folder/folder.validator.js";
import { verifyAuth } from "@middleware/auth.middleware.js";
import { validateData } from "@middleware/validate.middleware.js";
import { Router } from "express";

const authRoutes = Router();

// Apply authentication middleware to ALL folder routes
authRoutes.use(verifyAuth);

authRoutes
  .post("/", validateData(createFolderSchema), FolderController.createFolder)
  .get("/contents", FolderController.getFolderContents)       // Handle root contents
  .get("/contents/:id", FolderController.getFolderContents)   // Handle contents with ID
  .get("/:id", FolderController.getFolderById)                // Get folder by ID
  .patch("/:id", validateData(updateFolderSchema), FolderController.updateFolder)       // Update folder
  .patch("/:id/rename", validateData(renameFolderSchema), FolderController.renameFolder) // Rename a folder
  .patch("/:id/move", validateData(moveFolderSchema), FolderController.moveFolder)      // Move a folder to a new parent
  .get("/trash/contents", FolderController.getTrashFolderContents)  // Get trash folders
  .delete("/:id", FolderController.softDeleteFolder)          // Soft delete folder (move to trash)
  .delete("/:id/permanent", FolderController.permanentDeleteFolder) // Permanently delete folder
  .post("/:id/restore", FolderController.restoreFolder)       // Restore folder from trash
  .post("/trash/empty", FolderController.emptyTrash);      // Empty trash (delete everything)

const folderRoutes = Router();
folderRoutes.use("/folders", authRoutes);

export default folderRoutes;
