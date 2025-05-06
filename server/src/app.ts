import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import apiRoutes from "@api/api.routes.js";
import { API_PREFIX, API_VERSION, CLIENT_ORIGIN, PORT } from "@config/constants.js";
import { connectDatabase } from "@database/connection.js";
import { errorHandler } from "@middleware/errorHandler.middleware.js";
import logger from "@utils/logger.js";

const app = express();

// Connect to MongoDB
connectDatabase();

// Middleware
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

// Start server
app.listen(PORT, () => {
  logger.success(`Express server is listening at http://localhost:${PORT}`);
});
