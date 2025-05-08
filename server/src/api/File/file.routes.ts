import express from "express";
import FileController from "@api/File/file.controller.js";
import { verifyAuth } from "@middleware/auth.middleware.js";

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
authRoutes.get("/", FileController.getFiles);
authRoutes.get("/:id", FileController.getFileById);
authRoutes.patch("/:id", FileController.updateFile);
authRoutes.delete("/:id", FileController.deleteFile);
authRoutes.get("/:id/download", FileController.downloadFile);
authRoutes.post("/move", FileController.moveFiles);
authRoutes.get("/search", FileController.searchFiles);

//=============================================================================
// ROUTE REGISTRATION
//=============================================================================
const fileRoutes = express.Router();
fileRoutes.use("/file", authRoutes);

export default fileRoutes;