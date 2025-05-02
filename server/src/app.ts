import express from "express";
import { PORT, CLIENT_ORIGIN } from "./constants.js";
import logger from "./utils/logger.js";
import { connectDatabase } from "./database/connection.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import entryRoute from "./api/entry.routes.js";

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
app.get("/", (req, res) => {
  res.send("Welcome to the Dotfile API");
});

// API routes
app.use('/api', entryRoute);

// Start server
app.listen(PORT, () => {
  logger.success(`Express server is listening at http://localhost:${PORT}`);
});
