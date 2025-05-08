import express from "express";
import FileController from "@api/File/file.controller.js";
import { authenticate } from "@middleware/auth.middleware.js";

const router = express.Router();
const authRoutes = router.use(authenticate);

// File routes
authRoutes.post("/upload", FileController.uploadFile);
authRoutes.post("/upload/multiple", FileController.uploadMultipleFiles);

export default router;