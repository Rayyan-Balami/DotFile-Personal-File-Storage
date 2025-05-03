import { Router } from "express";
import { ApiResponse } from "../utils/apiResponse.js";
import { NODE_ENV } from "../constants.js";

const router = Router();

// Root API route
router.get("/", (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      {
        name: "Dotfile API",
        version: "1.0.0",
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
      },
      "API is running"
    )
  );
});

// Health check route
router.get("/health", (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      {
        status: "OK",
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
      "System is healthy"
    )
  );
});

export default router;
