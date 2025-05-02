import { Router } from "express";
import ApiResponse from "../utils/apiResponse.js";
import { NODE_ENV } from "../constants.js";

const router = Router();

// Root API route
router.get("/", (req, res) => {
  ApiResponse.success(res)
    .withData({
      name: "Dotfile API",
      version: "1.0.0",
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
    })
    .withMessage("API is running")
    .send();
});

// Health check route
router.get("/health", (req, res) => {
  ApiResponse.success(res)
    .withData({
      status: "OK",
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    })
    .withMessage("System is healthy")
    .send();
});

export default router;