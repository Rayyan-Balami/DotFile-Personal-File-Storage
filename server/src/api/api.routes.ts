import { NODE_ENV } from "@config/constants.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import { Router } from "express";
import fileRoutes from "@api/file/file.routes.js";
import folderRoutes from "./folder/folder.routes.js";
import userRoutes from "./user/user.routes.js";

const apiRoutes = Router();

// Root API route
apiRoutes
.get("/", (_, res) => {
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
})
.get("/health", (_, res) => {
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

// Mount routes
apiRoutes.use("/", userRoutes);
apiRoutes.use("/", fileRoutes);
apiRoutes.use("/", folderRoutes);

export default apiRoutes;
