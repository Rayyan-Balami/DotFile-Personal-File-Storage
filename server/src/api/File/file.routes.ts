import FileController from "@api/file/file.controller.js";
import { moveFileSchema, renameFileSchema, updateFileSchema } from "@api/file/file.validator.js";
import { verifyAuth } from "@middleware/auth.middleware.js";
import { validateData } from "@middleware/validate.middleware.js";
import express from "express";

//=============================================================================
// ROUTE INITIALIZATION
//=============================================================================
const authRoutes = express.Router();

//=============================================================================
// AUTHENTICATED USER ROUTES - Requires valid auth token
//=============================================================================
// Apply middleware once at the router level
authRoutes.use(verifyAuth);

// File routes
authRoutes.post("/upload", FileController.uploadFiles); // Single unified upload endpoint
authRoutes.get("/:id", FileController.getFileById);
authRoutes.patch("/:id", validateData(updateFileSchema), FileController.updateFile);
authRoutes.delete("/:id", FileController.softDeleteFile);
authRoutes.post("/:id/rename", validateData(renameFileSchema), FileController.renameFile); // Rename a file
authRoutes.post("/:id/move", validateData(moveFileSchema), FileController.moveFile);     // Move a file to a different folder
authRoutes.delete("/:id/permanent", FileController.permanentDeleteFile);                // Permanently delete file
authRoutes.post("/:id/restore", FileController.restoreFile);                           // Restore a file from trash
authRoutes.get("/", FileController.getUserFiles);
authRoutes.get("/:id/view", FileController.viewFile);
authRoutes.get("/:id/download", FileController.downloadFile);  // Add download endpoint
authRoutes.get("/:id/preview", FileController.viewPreview);    // Add preview endpoint

//=============================================================================
// ROUTE REGISTRATION
//=============================================================================
const fileRoutes = express.Router();
fileRoutes.use("/files", authRoutes);

export default fileRoutes;