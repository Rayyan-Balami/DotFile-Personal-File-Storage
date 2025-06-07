import { Router } from "express";
import FileController from "@api/file/file.controller.js";
import {
  moveFileSchema,
  renameFileSchema,
  updateFileSchema,
} from "@api/file/file.validator.js";
import { verifyAuth } from "@middleware/auth.middleware.js";
import { validateData } from "@middleware/validate.middleware.js";
import {
  upload,
  validateFileSize,
  processZipFiles,
  updateUserStorageUsage,
  handleAbortedUploads,
} from "@middleware/multer.middleware.js";
import { encryptFiles } from "@middleware/fileEncryption.middleware.js";
import { restrictTo } from "@middleware/accessControl.middleware.js";
import { UserRole } from "@api/user/user.dto.js";

//=========================//
// Init router and auth
//=========================//
const userRoutes = Router();
userRoutes.use(verifyAuth); // Require authentication
userRoutes.use(restrictTo([UserRole.USER]));

//=========================//
// File routes (chained)
//=========================//
userRoutes
  // CRUD operations
  .post(
    "/upload",
    handleAbortedUploads, // Handle client abort scenarios
    upload, // Multer file upload (validates compressed size only)
    validateFileSize, // Validates total batch size after upload
    processZipFiles, // Extract ZIP files & validate extracted content size
    encryptFiles, // Encrypt all files before storage
    updateUserStorageUsage, // Update user's storage usage in DB
    FileController.uploadFiles
  ) // Upload file
  .get("/", FileController.getUserFiles) // List user files
  .get("/recent", FileController.getRecentFiles) // Get recent files
  .get("/:id", FileController.getFileById) // Get file by ID
  .patch("/:id", validateData(updateFileSchema), FileController.updateFile) // Update file metadata
  .delete("/:id", FileController.softDeleteFile) // Soft delete file
  .delete("/:id/permanent", FileController.permanentDeleteFile) // Permanently delete
  .post("/:id/restore", FileController.restoreFile) // Restore from trash

  // File actions
  .post(
    "/:id/rename",
    validateData(renameFileSchema),
    FileController.renameFile
  ) // Rename file
  .post("/:id/move", validateData(moveFileSchema), FileController.moveFile) // Move file

  // File access
  .get("/:id/view", FileController.viewFile) // Stream/view file
  .get("/:id/download", FileController.downloadFile); // Download file

//=========================//
// Mount under /files
//=========================//
const fileRoutes = Router();
fileRoutes.use("/files", userRoutes);

export default fileRoutes;
