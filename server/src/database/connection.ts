import { MONGODB_DB_NAME, MONGODB_URI } from "@config/constants.js";
import logger from "@utils/logger.utils.js";
import mongoose from "mongoose";

// Connect to MongoDB
export const connectDatabase = async (): Promise<void> => {
  try {
    if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");

    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
    logger.success(`Connected to MongoDB: ${MONGODB_DB_NAME}`);
  } catch (error) {
    logger.error(error as Error);
    process.exit(1); // Fatal
  }
};

// Disconnect from MongoDB
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.success("Disconnected from MongoDB");
  } catch (error) {
    logger.error(error as Error);
  }
};
