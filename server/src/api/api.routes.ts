import { Router } from "express";
import { NODE_ENV } from "../constants.js";
import { ApiResponse } from "../utils/apiResponse.js";
import userRoutes from "./user/user.routes.js";
import planRoutes from "./plan/plan.routes.js";

const apiRoutes = Router();

// Root API route
apiRoutes.get("/", (req, res) => {
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
apiRoutes.get("/health", (req, res) => {
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

apiRoutes.use("/user", userRoutes);
apiRoutes.use("/plan", planRoutes);

export default apiRoutes;
