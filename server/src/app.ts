import apiRoutes from "@api/api.routes.js";
import {
  $dirname,
  $filename,
  API_PREFIX,
  API_VERSION,
  CLIENT_ORIGIN,
  PORT,
  ROOT_DIR,
  UPLOADS_DIR,
} from "@config/constants.js";
import { connectDatabase } from "@database/connection.js";
import { errorHandler } from "@middleware/errorHandler.middleware.js";
import { addRequestId } from "@middleware/requestId.middleware.js";
import logger from "@utils/logger.utils.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

const app = express();

// Connect to MongoDB
connectDatabase();

// Assign unique request ID to each request
app.use(addRequestId);

// Enable CORS for client origin with credentials
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

// Parse cookies and JSON / URL-encoded bodies (limit 20kb)
app.use(cookieParser());
app.use(express.static("public"));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

// Root welcome route
app.get("/", (_, res) => {
  res.send("Welcome to the Dotfile API");
});

// Mount API routes with versioning prefix
app.use(`${API_PREFIX}/${API_VERSION}`, apiRoutes);

// Global error handler - must be last middleware
app.use(errorHandler);

// Log key paths at startup
logger.info("File path:", $filename);
logger.info("Directory path:", $dirname);
logger.info("Root directory:", ROOT_DIR);
logger.info("Uploads directory:", UPLOADS_DIR);

// Start server
app.listen(PORT, () => {
  logger.success(`Express server is listening at http://localhost:${PORT}`);
});
