import mongoose from "mongoose";
import { MONGODB_DB_NAME, MONGODB_URI } from "@config/constants.js";
import logger from "@utils/logger.utils.js";

/**
 * Connect to MongoDB database
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    // Check if MongoDB URI is provided
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
    });

    logger.success(`Connected to MongoDB database: ${MONGODB_DB_NAME}`);
  } catch (error) {
    logger.error(error as Error);
    process.exit(1); // Exit with failure
  }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.success("Disconnected from MongoDB database");
  } catch (error) {
    logger.error(error as Error);
  }
};
