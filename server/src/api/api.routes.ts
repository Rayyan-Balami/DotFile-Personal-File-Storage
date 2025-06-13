import analyticsRoutes from "@api/analytics/analytics.routes.js";
import fileRoutes from "@api/file/file.routes.js";
import folderRoutes from "@api/folder/folder.routes.js";
import userRoutes from "@api/user/user.routes.js";
import { NODE_ENV } from "@config/constants.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import { Router } from "express";

const apiRoutes = Router();

/**
 * GET / - Root route for API metadata
 */
apiRoutes.get("/", (_, res) => {
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

/**
 * GET /health - System health check
 */
apiRoutes.get("/health", (_, res) => {
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

/**
 * Mount sub-routes: /auth, /users, /admin/users, /files, /folders, /analytics
 */
apiRoutes.use("/", userRoutes, fileRoutes, folderRoutes, analyticsRoutes);

export default apiRoutes;
