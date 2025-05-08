import folderService from "@api/Folder/folder.service.js";
import userService from "@api/user/user.service.js";
import { MAX_FILES_PER_FOLDER, MAX_FILES_PER_UPLOAD_BATCH, MAX_SIZE_PER_UPLOAD_BATCH, UPLOADS_DIR } from "@config/constants.js";
import { ApiError } from "@utils/apiError.js";
import logger from "@utils/logger.js";
import { getFolderDirectoryPath, getUserDirectoryPath } from "@utils/mkdir.utils.js";
import AdmZip from "adm-zip";
import { Request, Response } from "express";
import fs from "fs";
import multer, { FileFilterCallback, StorageEngine } from "multer";
import path from "path";

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
  }>;
}

// Store upload session information by request ID
const uploadSessions = new Map<string, UploadSessionInfo>();

// Define the storage configuration
const storage: StorageEngine = multer.diskStorage({
  destination: async function(
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
      
      // Get folder ID from request body or params
      const folderId = req.body.folderId || req.params.folderId;
      
      // Initialize upload session if not exists
      // Use the existing requestId from the requestId middleware
      const requestId = req.requestId;
      if (!uploadSessions.has(requestId)) {
        uploadSessions.set(requestId, {
          totalSize: 0,
          fileCount: 0,
          files: []
        });
      }
      
      let uploadPath = UPLOADS_DIR;
      
      if (userId && folderId) {
        // Check if folder exists and user has access
        try {
          const folder = await folderService.getFolderById(folderId, userId);
          uploadPath = getFolderDirectoryPath(userId, folderId);
        } catch (error) {
          return cb(new Error(`Invalid folder: ${error.message}`), "");
        }
      } else if (userId) {
        // Store file in the user's root directory
        uploadPath = getUserDirectoryPath(userId);
      }
      
      // Ensure directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      // Count existing files in destination folder
      fs.readdir(uploadPath, (err, files) => {
        if (err) {
          return cb(new Error(`Cannot read destination folder: ${err.message}`), "");
        }
        
        const existingFileCount = files.length;
        const sessionInfo = uploadSessions.get(requestId);
        
        // Check if this would exceed the max files per folder limit
        if (existingFileCount + (sessionInfo?.fileCount || 0) > MAX_FILES_PER_FOLDER) {
          return cb(new Error(`Folder would exceed maximum file limit (${MAX_FILES_PER_FOLDER})`), "");
        }
        
        cb(null, uploadPath);
      });
    } catch (error) {
      logger.error("Error in multer destination function:", error);
      cb(new Error(`Upload error: ${error.message}`), "");
    }
  },
  filename: function (
    req: Request, 
    file: Express.Multer.File, 
    cb: (error: Error | null, filename: string) => void
  ): void {
    // Get original filename without extension
    const originalName: string = path.parse(file.originalname).name;
    const extension: string = path.parse(file.originalname).ext;

    // Check if file exists and create versioned name if needed
    let finalName: string = `${originalName}${extension}`;
    let version: number = 1;
    
    // Get destination folder from request
    const userId = req.user?.id;
    const folderId = req.body.folderId || req.params.folderId;
    
    let uploadPath = UPLOADS_DIR;
    if (userId && folderId) {
      uploadPath = getFolderDirectoryPath(userId, folderId);
    } else if (userId) {
      uploadPath = getUserDirectoryPath(userId);
    }

    while (fs.existsSync(path.join(uploadPath, finalName))) {
      finalName = `${originalName}-v${version}${extension}`;
      version++;
    }

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
        files: []
      });
    }
    
    // Get user and plan info
    const user = await userService.getUserById(userId);
    if (!user || !user.plan) {
      return cb(new ApiError(400, "User plan not found"));
    }
    
    // Check if file is a zip and handle accordingly
    const isZip = file.originalname.endsWith('.zip');
    
    // Get session info
    const sessionInfo = uploadSessions.get(requestId);
    if (!sessionInfo) {
      return cb(new ApiError(500, "Upload session not found"));
    }
    
    // Check if adding this file would exceed the user's storage limit
    const newTotalSize = user.storageUsed + sessionInfo.totalSize + file.size;
    if (newTotalSize > user.plan.storageLimit) {
      return cb(new ApiError(413, "This upload would exceed your storage limit"));
    }
    
    // Check if adding this file would exceed the max files per batch limit
    if (sessionInfo.fileCount + 1 > MAX_FILES_PER_UPLOAD_BATCH) {
      return cb(new ApiError(413, `Too many files. Maximum ${MAX_FILES_PER_UPLOAD_BATCH} files per upload`));
    }
    
    // Check if adding this file would exceed the max size per batch limit
    if (sessionInfo.totalSize + file.size > MAX_SIZE_PER_UPLOAD_BATCH) {
      return cb(new ApiError(413, `Upload too large. Maximum ${MAX_SIZE_PER_UPLOAD_BATCH / 1024 / 1024}MB per upload`));
    }
    
    // Update session info
    sessionInfo.totalSize += file.size;
    sessionInfo.fileCount += 1;
    uploadSessions.set(requestId, sessionInfo);
    
    // Allow the file
    cb(null, true);
  } catch (error) {
    logger.error("Error in multer file filter:", error);
    cb(new ApiError(500, `Upload error: ${error.message}`));
  }
};

// Define multer configuration with proper typing
export const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_PER_UPLOAD_BATCH,
  }
});

// Process ZIP files after upload
export const processZipFiles = async (req: Request, res: Response, next: Function) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }
    
    const userId = req.user?.id;
    const folderId = req.body.folderId || req.params.folderId;
    const requestId = req.requestId; // Use the existing requestId
    
    if (!userId) {
      throw new ApiError(401, "User not authenticated");
    }
    
    let uploadPath = UPLOADS_DIR;
    if (userId && folderId) {
      uploadPath = getFolderDirectoryPath(userId, folderId);
    } else if (userId) {
      uploadPath = getUserDirectoryPath(userId);
    }
    
    // Track total size of all extracted files
    let totalExtractedSize = 0;
    
    // Process each file
    for (const file of req.files as Express.Multer.File[]) {
      if (file.originalname.endsWith('.zip')) {
        // Process ZIP file
        try {
          const zipPath = path.join(file.destination, file.filename);
          const zip = new AdmZip(zipPath);
          const zipEntries = zip.getEntries();
          
          // Check if extracting would exceed file count limit
          if (zipEntries.length > MAX_FILES_PER_FOLDER) {
            throw new ApiError(413, `ZIP contains too many files. Maximum ${MAX_FILES_PER_FOLDER} files per folder`);
          }
          
          // Calculate size of all contained files
          let zipContentSize = 0;
          zipEntries.forEach(entry => {
            zipContentSize += entry.header.size;
          });
          
          // Check user storage limit
          const user = await userService.getUserById(userId);
          if (!user || !user.plan) {
            throw new ApiError(400, "User plan not found");
          }
          
          const newTotalSize = user.storageUsed + totalExtractedSize + zipContentSize;
          if (newTotalSize > user.plan.storageLimit) {
            throw new ApiError(413, "Extracting this ZIP would exceed your storage limit");
          }
          
          // If all checks passed, extract the ZIP
          zip.extractAllTo(uploadPath, true);
          
          // Update the extracted size
          totalExtractedSize += zipContentSize;
          
          // Delete the original ZIP file
          fs.unlinkSync(zipPath);
          
          // Add extracted files to the upload session
          const sessionInfo = uploadSessions.get(requestId);
          if (sessionInfo) {
            sessionInfo.totalSize = (sessionInfo.totalSize - file.size) + zipContentSize;
            sessionInfo.fileCount = (sessionInfo.fileCount - 1) + zipEntries.length;
            uploadSessions.set(requestId, sessionInfo);
          }
        } catch (zipError) {
          logger.error(`Error processing ZIP file ${file.filename}:`, zipError);
          throw new ApiError(500, `Failed to process ZIP file: ${zipError.message}`);
        }
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to update user storage after upload
export const updateUserStorageUsage = async (req: Request, res: Response, next: Function) => {
  try {
    const requestId = req.requestId; // Use the existing requestId
    if (!uploadSessions.has(requestId)) {
      return next();
    }
    
    const userId = req.user?.id;
    if (!userId) {
      return next();
    }
    
    const sessionInfo = uploadSessions.get(requestId);
    
    // Update user's storage usage in database
    await userService.updateUserStorageUsage(userId, sessionInfo!.totalSize);
    
    // Clean up session
    uploadSessions.delete(requestId);
    
    next();
  } catch (error) {
    logger.error("Error updating user storage usage:", error);
    next(error);
  }
};