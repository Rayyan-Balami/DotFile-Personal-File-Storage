import { Router } from "express";
import { NODE_ENV } from "@config/constants.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import userRoutes from "@api/user/user.routes.js";
import planRoutes from "@api/plan/plan.routes.js";
import folderRoutes from "./Folder/folder.routes.js";
import fileRoutes from "./File/file.routes.js";
import workspaceRoutes from "./workspace/workspace.routes.js";

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

apiRoutes.use("/", userRoutes);
apiRoutes.use("/", planRoutes);
apiRoutes.use("/", folderRoutes);
apiRoutes.use("/", fileRoutes);
apiRoutes.use("/workspaces", workspaceRoutes);

export default apiRoutes;
