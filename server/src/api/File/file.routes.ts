import { Router } from "express";
import FileController from "@api/file/file.controller.js";
import {
  moveFileSchema,
  renameFileSchema,
  updateFileSchema
} from "@api/file/file.validator.js";
import { verifyAuth } from "@middleware/auth.middleware.js";
import { validateData } from "@middleware/validate.middleware.js";
import { upload, validateFileSize, processZipFiles, updateUserStorageUsage } from "@middleware/multer.middleware.js";
import { encryptFiles } from "@middleware/fileEncryption.middleware.js";

//=========================//
// Init router and auth
//=========================//
const authRoutes = Router();
authRoutes.use(verifyAuth); // Require authentication

//=========================//
// File routes (chained)
//=========================//
authRoutes
  // CRUD operations
  .post("/upload", 
    upload,
    validateFileSize,
    processZipFiles,
    encryptFiles,
    updateUserStorageUsage,
    FileController.uploadFiles
  )                            // Upload file
  .get("/", FileController.getUserFiles)                                  // List user files
  .get("/recent", FileController.getRecentFiles)                         // Get recent files
  .get("/:id", FileController.getFileById)                                // Get file by ID
  .patch("/:id", validateData(updateFileSchema), FileController.updateFile) // Update file metadata
  .delete("/:id", FileController.softDeleteFile)                          // Soft delete file
  .delete("/:id/permanent", FileController.permanentDeleteFile)          // Permanently delete
  .post("/:id/restore", FileController.restoreFile)                       // Restore from trash

  // File actions
  .post("/:id/rename", validateData(renameFileSchema), FileController.renameFile) // Rename file
  .post("/:id/move", validateData(moveFileSchema), FileController.moveFile)       // Move file

  // File access
  .get("/:id/view", FileController.viewFile)                             // Stream/view file
  .get("/:id/download", FileController.downloadFile);                    // Download file

//=========================//
// Mount under /files
//=========================//
const fileRoutes = Router();
fileRoutes.use("/files", authRoutes);

export default fileRoutes;
