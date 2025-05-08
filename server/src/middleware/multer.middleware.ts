import userService from "@api/user/user.service.js";
import {
  MAX_FILES_PER_FOLDER,
  MAX_FILES_PER_UPLOAD_BATCH,
  MAX_SIZE_PER_UPLOAD_BATCH,
  UPLOADS_DIR,
} from "@config/constants.js";
import { ApiError } from "@utils/apiError.js";
import logger from "@utils/logger.js";
import { getUserDirectoryPath, removeFile } from "@utils/mkdir.utils.js";
import AdmZip from "adm-zip";
import crypto from "crypto";
import { Request, Response } from "express";
import fs from "fs";
import multer, { FileFilterCallback, StorageEngine } from "multer";
import path from "path";

// Helper function to safely get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Helper function to check if the plan object has the expected structure
function isUserPlanDTO(plan: any): plan is { storageLimit: number } {
  return (
    plan &&
    typeof plan === "object" &&
    "storageLimit" in plan &&
    typeof plan.storageLimit === "number"
  );
}

// Sanitize filename to follow regex pattern: /^(?!\.{1,2}$)(?!\s*$)(?!.*\/)[a-zA-Z0-9 _\-.]+$/
function sanitizeFilename(filename: string): string {
  // Remove invalid characters, keeping only alphanumeric, spaces, underscores, dashes, and dots
  let sanitized = filename.replace(/[^a-zA-Z0-9 _\-.]/g, '');
  
  // Ensure it doesn't start or end with dots or spaces
  sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');
  
  // Limit length to avoid OS path issues (typically 255 chars max)
  const MAX_FILENAME_LENGTH = 100;
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    sanitized = sanitized.substring(0, MAX_FILENAME_LENGTH);
  }
  
  // If sanitization left an empty string, use a generic name
  if (!sanitized) {
    sanitized = "file";
  }
  
  return sanitized;
}

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Interface for tracking files in the current upload session
interface UploadSessionInfo {
  totalSize: number;
  fileCount: number;
  files: Array<{
    originalname: string;
    size: number;
    destination: string;
    filename: string;
    virtualPath?: string; // Track original folder structure
  }>;
}

// Store upload session information by request ID
const uploadSessions = new Map<string, UploadSessionInfo>();

// Map to track file to folder mappings (for files extracted from zip)
export const fileToFolderMap: Record<string, string> = {};

// Track file IDs created in the database for rollback purposes
export const createdFileIds = new Map<string, string[]>();

// Define the storage configuration
const storage: StorageEngine = multer.diskStorage({
  destination: async function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ): Promise<void> {
    try {
      // Get user ID from authenticated request
      const userId = req.user?.id;
      if (!userId) {
        return cb(new Error("User not authenticated"), "");
      }

      // Initialize upload session if not exists
      const requestId = req.requestId;
      if (!uploadSessions.has(requestId)) {
        uploadSessions.set(requestId, {
          totalSize: 0,
          fileCount: 0,
          files: [],
        });
      }

      // Store files directly in user's directory (flat structure)
      const uploadPath = getUserDirectoryPath(userId);

      // Ensure directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      // Count existing files in destination folder
      fs.readdir(uploadPath, (err, files) => {
        if (err) {
          return cb(
            new Error(`Cannot read destination folder: ${err.message}`),
            ""
          );
        }

        const existingFileCount = files.length;
        const sessionInfo = uploadSessions.get(requestId);

        // Check if this would exceed the max files per folder limit
        if (
          existingFileCount + (sessionInfo?.fileCount || 0) >
          MAX_FILES_PER_FOLDER
        ) {
          return cb(
            new Error(
              `User directory would exceed maximum file limit (${MAX_FILES_PER_FOLDER})`
            ),
            ""
          );
        }

        cb(null, uploadPath);
      });
    } catch (error: unknown) {
      logger.error("Error in multer destination function:", error);
      cb(new Error(`Upload error: ${getErrorMessage(error)}`), "");
    }
  },
  filename: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ): void {
    // Sanitize the original filename
    const originalName: string = sanitizeFilename(path.parse(file.originalname).name);
    const extension: string = path.parse(file.originalname).ext;

    // Generate a short unique identifier (6 chars should be sufficient for most cases)
    const uniqueId = crypto.randomBytes(3).toString("hex"); // 3 bytes = 6 hex chars
    
    // Format: originalname-uniqueId.extension
    // No need for full timestamp which makes filenames very long
    const finalName: string = `${originalName}-${uniqueId}${extension}`;

    cb(null, finalName);
  },
});

// Check storage limits and file types
const fileFilter = async (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  try {
    // Get user ID from authenticated request
    const userId = req.user?.id;
    if (!userId) {
      return cb(new ApiError(401, "User not authenticated"));
    }

    // Initialize upload session if not exists - using requestId
    const requestId = req.requestId;
    if (!uploadSessions.has(requestId)) {
      uploadSessions.set(requestId, {
        totalSize: 0,
        fileCount: 0,
        files: [],
      });
    }

    // Get user and plan info
    const user = await userService.getUserById(userId);
    if (!user || !user.plan) {
      return cb(new ApiError(400, "User plan not found"));
    }

    // Get session info
    const sessionInfo = uploadSessions.get(requestId);
    if (!sessionInfo) {
      return cb(new ApiError(500, "Upload session not found"));
    }

    // Check if adding this file would exceed the user's storage limit
    const newTotalSize = user.storageUsed + sessionInfo.totalSize + file.size;

    if (
      typeof user.plan === "object" &&
      isUserPlanDTO(user.plan) &&
      newTotalSize > user.plan.storageLimit
    ) {
      return cb(
        new ApiError(413, "This upload would exceed your storage limit")
      );
    }

    // Check if adding this file would exceed the max files per batch limit
    if (sessionInfo.fileCount + 1 > MAX_FILES_PER_UPLOAD_BATCH) {
      return cb(
        new ApiError(
          413,
          `Too many files. Maximum ${MAX_FILES_PER_UPLOAD_BATCH} files per upload`
        )
      );
    }

    // Check if adding this file would exceed the max size per batch limit
    if (sessionInfo.totalSize + file.size > MAX_SIZE_PER_UPLOAD_BATCH) {
      return cb(
        new ApiError(
          413,
          `Upload too large. Maximum ${MAX_SIZE_PER_UPLOAD_BATCH / 1024 / 1024}MB per upload`
        )
      );
    }

    // Update session info
    sessionInfo.totalSize += file.size;
    sessionInfo.fileCount += 1;
    uploadSessions.set(requestId, sessionInfo);

    // Allow the file
    cb(null, true);
  } catch (error: unknown) {
    logger.error("Error in multer file filter:", error);
    cb(new ApiError(500, `Upload error: ${getErrorMessage(error)}`));
  }
};

// Define multer configuration with proper typing
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_PER_UPLOAD_BATCH,
  },
});

// Extract a flag from request to determine if zip file is a folder package
export const isZipFolder = (req: Request, zipFilename: string): boolean => {
  // Check if explicitly marked as folder zip in the request
  if (req.body.zipAsFolder === "true") {
    return true;
  }

  // Check if upload was initiated with folder selection on frontend
  if (req.body.isFolder === "true" && zipFilename.endsWith(".zip")) {
    return true;
  }

  // Default to treating zip as regular file
  return false;
};

// Process ZIP files after upload
export const processZipFiles = async (
  req: Request,
  res: Response,
  next: Function
) => {
  try {
    if (
      !req.files ||
      (Array.isArray(req.files) && req.files.length === 0 && !req.file)
    ) {
      return next();
    }

    const userId = req.user?.id;
    const folderId = req.body.folderId || req.params.folderId;
    const requestId = req.requestId;

    if (!userId) {
      throw new ApiError(401, "User not authenticated");
    }

    // Use flat structure - user's directory
    const uploadPath = getUserDirectoryPath(userId);

    // Track total size of all extracted files
    let totalExtractedSize = 0;

    // Get files array, handling both single and multiple file cases
    const filesArray: Express.Multer.File[] = Array.isArray(req.files)
      ? req.files
      : req.file
        ? [req.file]
        : [];

    // Process each file
    for (const file of filesArray) {
      if (
        file.originalname.endsWith(".zip") &&
        isZipFolder(req, file.originalname)
      ) {
        // Process ZIP folder package
        try {
          const zipPath = path.join(file.destination, file.filename);
          const zip = new AdmZip(zipPath);
          const zipEntries = zip.getEntries();

          // Check if extracting would exceed file count limit
          if (zipEntries.length > MAX_FILES_PER_FOLDER) {
            throw new ApiError(
              413,
              `ZIP contains too many files. Maximum ${MAX_FILES_PER_FOLDER} files per folder`
            );
          }

          // Calculate size of all contained files
          let zipContentSize = 0;
          zipEntries.forEach((entry) => {
            zipContentSize += entry.header.size;
          });

          // Check user storage limit
          const user = await userService.getUserById(userId);
          if (!user || !user.plan) {
            throw new ApiError(400, "User plan not found");
          }

          const newTotalSize =
            user.storageUsed + totalExtractedSize + zipContentSize;
          if (
            typeof user.plan === "object" &&
            isUserPlanDTO(user.plan) &&
            newTotalSize > user.plan.storageLimit
          ) {
            throw new ApiError(
              413,
              "Extracting this ZIP would exceed your storage limit"
            );
          }

          // Extract each file with a unique name and track its virtual path
          for (const entry of zipEntries) {
            if (!entry.isDirectory) {
              const entryName = sanitizeFilename(path.basename(entry.entryName));
              const entryPath = path.dirname(entry.entryName);

              // Generate unique name for the file using shorter format
              const uniqueId = crypto.randomBytes(3).toString("hex"); // 3 bytes = 6 hex chars
              const uniqueName = `${path.parse(entryName).name}-${uniqueId}${path.parse(entryName).ext}`;

              // Extract with unique name
              entry.entryName = uniqueName;
              zip.extractEntryTo(entry, uploadPath, false, true);

              // Store the mapping of physical file to virtual path
              fileToFolderMap[uniqueName] = entryPath !== "." ? entryPath : "";

              // Add to session info for tracking
              const sessionInfo = uploadSessions.get(requestId);
              if (sessionInfo) {
                sessionInfo.files.push({
                  originalname: entryName,
                  size: entry.header.size,
                  destination: uploadPath,
                  filename: uniqueName,
                  virtualPath: entryPath !== "." ? entryPath : "",
                });
              }
            }
          }

          // Update the extracted size
          totalExtractedSize += zipContentSize;

          // Delete the original ZIP file
          fs.unlinkSync(zipPath);
        } catch (zipError: unknown) {
          logger.error(`Error processing ZIP file ${file.filename}:`, zipError);
          throw new ApiError(
            500,
            `Failed to process ZIP file: ${getErrorMessage(zipError)}`
          );
        }
      } else {
        // Regular file or zip treated as a file - no need for additional processing
        const sessionInfo = uploadSessions.get(requestId);
        if (sessionInfo) {
          sessionInfo.files.push({
            originalname: sanitizeFilename(file.originalname),
            size: file.size,
            destination: file.destination,
            filename: file.filename,
          });
        }
      }
    }

    next();
  } catch (error: unknown) {
    // Rollback - clean up any extracted files
    try {
      const requestId = req.requestId;
      const sessionInfo = uploadSessions.get(requestId);
      
      if (sessionInfo && sessionInfo.files.length > 0) {
        logger.info(`Rolling back ${sessionInfo.files.length} uploaded files due to error`);
        
        // Delete all files created in this session
        for (const file of sessionInfo.files) {
          const filePath = path.join(file.destination, file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.debug(`Removed file during rollback: ${filePath}`);
          }
        }
      }
    } catch (cleanupError) {
      logger.error("Error during file rollback cleanup:", cleanupError);
    }
    
    next(
      new ApiError(500, `Error processing files: ${getErrorMessage(error)}`)
    );
  }
};

// Middleware to update user storage after upload
export const updateUserStorageUsage = async (
  req: Request,
  res: Response,
  next: Function
) => {
  try {
    const requestId = req.requestId;
    if (!uploadSessions.has(requestId)) {
      return next();
    }

    const userId = req.user?.id;
    if (!userId) {
      return next();
    }

    const sessionInfo = uploadSessions.get(requestId);
    
    // Calculate the actual total size from all files in this upload session
    let bytesToAdd = 0;
    if (sessionInfo && Array.isArray(sessionInfo.files)) {
      sessionInfo.files.forEach(file => {
        if (typeof file.size === 'number' && !isNaN(file.size)) {
          bytesToAdd += file.size;
        }
      });
    }
    
    logger.debug(`Updating storage for user ${userId} with ${bytesToAdd} bytes`);

    // Only update if we have a valid size to add
    if (bytesToAdd > 0) {
      // Update user's storage usage in database
      await userService.updateUserStorageUsage(userId, bytesToAdd);
    }

    // Make file mapping available in the request for the controller
    req.fileToFolderMap = fileToFolderMap;
    
    // Store the session info for potential rollback later
    req.uploadedFiles = sessionInfo?.files || [];

    // Clean up session
    uploadSessions.delete(requestId);

    next();
  } catch (error: unknown) {
    // Try to rollback any files that were uploaded
    try {
      const requestId = req.requestId;
      const sessionInfo = uploadSessions.get(requestId);
      
      if (sessionInfo && sessionInfo.files.length > 0) {
        logger.info(`Rolling back ${sessionInfo.files.length} uploaded files due to storage update error`);
        
        // Delete all files created in this session
        for (const file of sessionInfo.files) {
          const filePath = path.join(file.destination, file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.debug(`Removed file during rollback: ${filePath}`);
          }
        }
      }
      
      // Clean up session
      uploadSessions.delete(requestId);
    } catch (cleanupError) {
      logger.error("Error during file rollback cleanup:", cleanupError);
    }
    
    logger.error("Error updating user storage usage:", error);
    next(
      new ApiError(
        500,
        `Error updating user storage usage: ${getErrorMessage(error)}`
      )
    );
  }
};

// Helper function to clean up uploaded files when database operations fail
export const rollbackUploadedFiles = async (req: Request): Promise<void> => {
  try {
    const uploadedFiles = req.uploadedFiles || [];
    
    if (uploadedFiles.length > 0) {
      logger.info(`Rolling back ${uploadedFiles.length} uploaded files due to database error`);
      
      // Delete all files created in this upload
      for (const file of uploadedFiles) {
        const filePath = path.join(file.destination, file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.debug(`Removed file during database rollback: ${filePath}`);
        }
      }
    }
  } catch (error) {
    logger.error("Error during file rollback cleanup:", error);
  }
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      fileToFolderMap?: Record<string, string>;
      uploadedFiles?: Array<{
        originalname: string;
        size: number;
        destination: string;
        filename: string;
        virtualPath?: string;
      }>;
      rollbackUploadedFiles?: () => Promise<void>;
    }
  }
}
