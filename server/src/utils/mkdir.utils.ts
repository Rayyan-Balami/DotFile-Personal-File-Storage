import fs from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '@config/constants.js';
import logger from '@utils/logger.js';

/**
 * Type guard to check if an error is an Error object
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Get error message safely regardless of error type
 */
function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  return String(error);
}

/**
 * Creates a folder with the given name inside the upload directory
 * @param folderName The name of the folder to create
 * @returns The full path of the created folder
 */
export const mkdir = (folderName: string): string => {
  try {
    const folderPath = path.join(UPLOADS_DIR, folderName);
    logger.debug(`Attempting to create directory: ${folderPath}`);

    // Check if the folder already exists
    if (!fs.existsSync(folderPath)) {
      // Create the folder (including any missing parent directories)
      fs.mkdirSync(folderPath, { recursive: true });
      logger.info(`Created new directory: ${folderPath}`);
    } else {
      logger.debug(`Directory already exists: ${folderPath}`);
    }

    return folderPath;
  } catch (error: unknown) {
    logger.error(`Failed to create directory ${folderName}:`, error);
    throw new Error(`Failed to create directory ${folderName}: ${getErrorMessage(error)}`);
  }
};

/**
 * Creates a user directory with the format `user-{userId}`
 * @param userId The user ID to create a directory for
 * @returns The full path to the created user directory
 */
export const createUserDirectory = (userId: string): string => {
  try {
    logger.info(`Creating directory for user: ${userId}`);
    const userDirName = `user-${userId}`;
    logger.debug(`User directory name: ${userDirName}`);
    
    const dirPath = mkdir(userDirName);
    logger.info(`Created user directory at ${dirPath}`);
    
    // List files in uploads dir to verify
    try {
      const files = fs.readdirSync(UPLOADS_DIR);
      logger.debug(`Contents of uploads directory after creation:`, files);
    } catch (readError: unknown) {
      logger.warn(`Could not read uploads directory after user dir creation:`, readError);
      // Non-critical error, continue execution
    }
    
    return dirPath;
  } catch (error: unknown) {
    logger.error(`Failed to create user directory for ${userId}:`, error);
    // Consider whether to throw or handle the error based on your application's needs
    throw new Error(`Failed to create user directory: ${getErrorMessage(error)}`);
  }
};

/**
 * Creates a folder directory with the format `folder-{folderId}`
 * inside a user's directory
 * @param userId The user ID who owns the folder
 * @param folderId The folder ID to create a directory for
 * @returns The full path to the created folder directory
 */
export const createFolderDirectory = (userId: string, folderId: string): string => {
  try {
    logger.info(`Creating folder directory for folder ${folderId} owned by user ${userId}`);
    const userDirName = `user-${userId}`;
    const folderDirName = `folder-${folderId}`;
    const userDirPath = path.join(UPLOADS_DIR, userDirName);
    const folderPath = path.join(userDirPath, folderDirName);
    
    // Create user directory if it doesn't exist
    if (!fs.existsSync(userDirPath)) {
      logger.debug(`User directory doesn't exist, creating: ${userDirPath}`);
      try {
        fs.mkdirSync(userDirPath, { recursive: true });
        logger.info(`Created user directory: ${userDirPath}`);
      } catch (userDirError: unknown) {
        logger.error(`Failed to create user directory: ${userDirPath}`, userDirError);
        throw new Error(`Failed to create user directory: ${getErrorMessage(userDirError)}`);
      }
    }
    
    // Create folder directory
    if (!fs.existsSync(folderPath)) {
      logger.debug(`Creating folder directory: ${folderPath}`);
      try {
        fs.mkdirSync(folderPath, { recursive: true });
        logger.info(`Created folder directory: ${folderPath}`);
      } catch (folderDirError: unknown) {
        logger.error(`Failed to create folder directory: ${folderPath}`, folderDirError);
        throw new Error(`Failed to create folder directory: ${getErrorMessage(folderDirError)}`);
      }
    } else {
      logger.debug(`Folder directory already exists: ${folderPath}`);
    }
    
    return folderPath;
  } catch (error: unknown) {
    logger.error(`Failed in createFolderDirectory operation:`, error);
    throw new Error(`Failed to create folder directory: ${getErrorMessage(error)}`);
  }
};

/**
 * Returns the path to a user's storage directory
 * @param userId The user ID
 * @returns The path to the user's storage directory
 */
export const getUserDirectoryPath = (userId: string): string => {
  try {
    const userPath = path.join(UPLOADS_DIR, `user-${userId}`);
    logger.debug(`Resolved user directory path: ${userPath}`);
    
    // Optional: Verify the path exists
    if (!fs.existsSync(userPath)) {
      logger.warn(`User directory does not exist: ${userPath}`);
    }
    
    return userPath;
  } catch (error: unknown) {
    logger.error(`Failed to get user directory path for ${userId}:`, error);
    throw new Error(`Failed to get user directory path: ${getErrorMessage(error)}`);
  }
};

/**
 * Returns the path to a folder's storage directory
 * @param userId The user ID who owns the folder
 * @param folderId The folder ID
 * @returns The path to the folder's storage directory
 */
export const getFolderDirectoryPath = (userId: string, folderId: string): string => {
  try {
    const folderPath = path.join(UPLOADS_DIR, `user-${userId}`, `folder-${folderId}`);
    logger.debug(`Resolved folder directory path: ${folderPath}`);
    
    // Optional: Verify the path exists
    if (!fs.existsSync(folderPath)) {
      logger.warn(`Folder directory does not exist: ${folderPath}`);
    }
    
    return folderPath;
  } catch (error: unknown) {
    logger.error(`Failed to get folder directory path for folder ${folderId} owned by user ${userId}:`, error);
    throw new Error(`Failed to get folder directory path: ${getErrorMessage(error)}`);
  }
};

/**
 * Checks if a directory exists and is accessible
 * @param dirPath Path to check
 * @returns Boolean indicating if directory exists and is accessible
 */
export const directoryExists = (dirPath: string): boolean => {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch (error: unknown) {
    logger.error(`Error checking if directory exists: ${dirPath}`, error);
    return false;
  }
};

/**
 * Safely removes a directory and its contents
 * @param dirPath Directory to remove
 * @returns Boolean indicating success
 */
export const removeDirectory = (dirPath: string): boolean => {
  try {
    if (fs.existsSync(dirPath)) {
      logger.debug(`Removing directory: ${dirPath}`);
      fs.rmSync(dirPath, { recursive: true, force: true });
      logger.info(`Successfully removed directory: ${dirPath}`);
      return true;
    }
    logger.debug(`Directory doesn't exist, nothing to remove: ${dirPath}`);
    return true;
  } catch (error: unknown) {
    logger.error(`Failed to remove directory ${dirPath}:`, error);
    return false;
  }
};
