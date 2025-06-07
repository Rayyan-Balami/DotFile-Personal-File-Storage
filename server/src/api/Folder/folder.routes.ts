import { Router } from "express";
import FolderController from "@api/folder/folder.controller.js";
import {
  createFolderSchema,
  moveFolderSchema,
  renameFolderSchema,
  updateFolderSchema,
} from "@api/folder/folder.validator.js";
import { verifyAuth } from "@middleware/auth.middleware.js";
import { validateData } from "@middleware/validate.middleware.js";
import { restrictTo } from "@middleware/accessControl.middleware.js";
import { UserRole } from "@api/user/user.dto.js";

//=========================//
// Init router and auth
//=========================//
const userRoutes = Router();
userRoutes.use(verifyAuth); // Require authentication
userRoutes.use(restrictTo([UserRole.USER]));

//=========================//
// Folder routes (chained)
//=========================//
userRoutes
  // Create
  .post("/", validateData(createFolderSchema), FolderController.createFolder) // Create folder

  // Read
  .get("/contents", FolderController.getFolderContents) // Root folder contents
  .get("/contents/:id", FolderController.getFolderContents) // Folder contents by ID
  .get("/:id", FolderController.getFolderById) // Get folder by ID

  // Update
  .patch(
    "/:id",
    validateData(updateFolderSchema),
    FolderController.updateFolder
  ) // Update metadata
  .patch(
    "/:id/rename",
    validateData(renameFolderSchema),
    FolderController.renameFolder
  ) // Rename folder
  .patch(
    "/:id/move",
    validateData(moveFolderSchema),
    FolderController.moveFolder
  ) // Move folder

  // Trash handling
  .get("/trash/contents", FolderController.getTrashFolderContents) // Get trash contents
  .get("/pins/contents", FolderController.getPinContents) // Get pinned contents
  .delete("/:id", FolderController.softDeleteFolder) // Soft delete (move to trash)
  .delete("/:id/permanent", FolderController.permanentDeleteFolder) // Permanently delete
  .post("/:id/restore", FolderController.restoreFolder) // Restore from trash
  .post("/trash/empty", FolderController.emptyTrash) // Empty entire trash
  .get("/:id/hasDeletedAncestor", FolderController.hasDeletedAncestor); // Check for deleted ancestors

//=========================//
// Mount under /folders
//=========================//
const folderRoutes = Router();
folderRoutes.use("/folders", userRoutes);

export default folderRoutes;
