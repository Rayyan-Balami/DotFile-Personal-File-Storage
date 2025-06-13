import { UPLOADS_DIR } from "@config/constants.js";
import logger from "@utils/logger.utils.js";
import fs from "fs";
import path from "path";

/**
 * Type guard to confirm if unknown is an Error
 * @param error Unknown value
 * @returns true if error is an Error object
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Extract error message safely from any error type
 * @param error Unknown error object/value
 * @returns Error message string
 */
function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  return String(error);
}

/**
 * Create folder inside UPLOADS_DIR if not exists
 * @param folderName Name of folder to create
 * @returns Full path of created/existing folder
 * @throws Error on failure
 */
export const mkdir = (folderName: string): string => {
  try {
    const folderPath = path.join(UPLOADS_DIR, folderName);
    logger.debug(`[mkdir] Attempt creating directory: ${folderPath}`);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      logger.info(`[mkdir] Directory created: ${folderPath}`);
    } else {
      logger.debug(`[mkdir] Directory exists: ${folderPath}`);
    }

    return folderPath;
  } catch (error: unknown) {
    logger.error(`[mkdir] Failed creating directory ${folderName}:`, error);
    throw new Error(
      `[mkdir] Creation failed for ${folderName}: ${getErrorMessage(error)}`
    );
  }
};

/**
 * Create user folder with prefix 'user-' inside UPLOADS_DIR
 * @param userId User ID string
 * @returns Full path of created user directory
 * @throws Error on failure
 */
export const createUserDirectory = (userId: string): string => {
  try {
    logger.info(`[createUserDirectory] Creating dir for user: ${userId}`);
    const userDirName = `user-${userId}`;
    logger.debug(`[createUserDirectory] Dir name: ${userDirName}`);

    const dirPath = mkdir(userDirName);
    logger.info(`[createUserDirectory] Created user directory: ${dirPath}`);

    // Verify contents of uploads dir
    try {
      const files = fs.readdirSync(UPLOADS_DIR);
      logger.debug(
        `[createUserDirectory] Uploads dir contents after creation:`,
        files
      );
    } catch (readError: unknown) {
      logger.warn(
        `[createUserDirectory] Could not read uploads dir:`,
        readError
      );
    }

    return dirPath;
  } catch (error: unknown) {
    logger.error(`[createUserDirectory] Failed for user ${userId}:`, error);
    throw new Error(
      `[createUserDirectory] Creation failed: ${getErrorMessage(error)}`
    );
  }
};

/**
 * Get full path for a user's directory (user-{userId})
 * @param userId User ID
 * @returns Path string for user directory
 * @throws Error if path resolution fails
 */
export const getUserDirectoryPath = (userId: string): string => {
  try {
    const userPath = path.join(UPLOADS_DIR, `user-${userId}`);
    logger.debug(`[getUserDirectoryPath] Resolved path: ${userPath}`);

    if (!fs.existsSync(userPath)) {
      logger.warn(
        `[getUserDirectoryPath] Directory does not exist: ${userPath}`
      );
    }

    return userPath;
  } catch (error: unknown) {
    logger.error(`[getUserDirectoryPath] Failed for user ${userId}:`, error);
    throw new Error(
      `[getUserDirectoryPath] Retrieval failed: ${getErrorMessage(error)}`
    );
  }
};

/**
 * Check if directory exists and is accessible
 * @param dirPath Directory path to check
 * @returns true if directory exists and is valid folder
 */
export const directoryExists = (dirPath: string): boolean => {
  try {
    const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    logger.debug(`[directoryExists] Exists check for ${dirPath}: ${exists}`);
    return exists;
  } catch (error: unknown) {
    logger.error(
      `[directoryExists] Error checking directory: ${dirPath}`,
      error
    );
    return false;
  }
};

/**
 * Remove a file safely if it exists
 * @param filePath Path to the file to remove
 * @returns true if file removed or not existing; false on failure
 */
export const removeFile = (filePath: string): boolean => {
  try {
    if (fs.existsSync(filePath)) {
      logger.debug(`[removeFile] Removing file: ${filePath}`);
      fs.unlinkSync(filePath);
      logger.info(`[removeFile] File removed: ${filePath}`);
      return true;
    }
    logger.debug(`[removeFile] File not found, nothing to remove: ${filePath}`);
    return true;
  } catch (error: unknown) {
    logger.error(`[removeFile] Failed removing file ${filePath}:`, error);
    return false;
  }
};

/**
 * Remove a directory and all contents recursively
 * @param dirPath Directory path to remove
 * @returns true if directory removed or not existing; false on failure
 */
export const removeDirectory = (dirPath: string): boolean => {
  try {
    if (fs.existsSync(dirPath)) {
      logger.debug(`[removeDirectory] Removing directory: ${dirPath}`);
      fs.rmSync(dirPath, { recursive: true, force: true });
      logger.info(`[removeDirectory] Directory removed: ${dirPath}`);
      return true;
    }
    logger.debug(
      `[removeDirectory] Directory not found, nothing to remove: ${dirPath}`
    );
    return true;
  } catch (error: unknown) {
    logger.error(
      `[removeDirectory] Failed removing directory ${dirPath}:`,
      error
    );
    return false;
  }
};
