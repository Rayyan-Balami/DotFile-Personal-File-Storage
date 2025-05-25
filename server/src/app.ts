import apiRoutes from "@api/api.routes.js";
import { $dirname, $filename, API_PREFIX, API_VERSION, CLIENT_ORIGIN, PORT, ROOT_DIR, UPLOADS_DIR } from "@config/constants.js";
import { connectDatabase } from "@database/connection.js";
import { errorHandler } from "@middleware/errorHandler.middleware.js";
import { addRequestId } from "@middleware/requestId.middleware.js"; // Import the middleware
import logger from "@utils/logger.utils.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

const app = express();

// Connect to MongoDB
connectDatabase();

// Apply the request ID middleware first so all requests get an ID
app.use(addRequestId);

// Other middleware
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.static("public"));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

// Base route
app.get("/", (_, res) => {
  res.send("Welcome to the Dotfile API");
});

// API routes
app.use(`${API_PREFIX}/${API_VERSION}`, apiRoutes);

// Error handling middleware - must be after all routes
app.use(errorHandler);

logger.info('File path:', $filename);
logger.info('Directory path:', $dirname);
logger.info('Root directory:', ROOT_DIR);
logger.info('Uploads directory:', UPLOADS_DIR);

// Start server
app.listen(PORT, () => {
  logger.success(`Express server is listening at http://localhost:${PORT}`);
});
