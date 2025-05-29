// Multer & ZIP Upload Handler Middleware with Folder Structure Preservation and Validation

import folderService from "@api/folder/folder.service.js";
import userService from "@api/user/user.service.js";
import {
  MAX_FILES_PER_FOLDER,
  MAX_FILES_PER_UPLOAD_BATCH,
  MAX_SIZE_PER_UPLOAD_BATCH,
  UPLOADS_DIR,
  ZIP_NAME_PREFIX,
} from "@config/constants.js";
import { ApiError } from "@utils/apiError.utils.js";
import logger from "@utils/logger.utils.js";
import { getUserDirectoryPath } from "@utils/mkdir.utils.js";
import { formatBytes } from "@utils/formatBytes.utils.js";
import AdmZip from "adm-zip";
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import fs from "fs";
import mime from "mime-types";
import multer, { FileFilterCallback, StorageEngine } from "multer";
import path from "path";
import { Types } from "mongoose";

// --------------------- Types & Declarations ---------------------

interface UploadedFile {
  originalname: string;
  filename: string;
  size: number;
  destination: string;
}

interface UploadSession {
  totalSize: number;
  fileCount: number;
  files: UploadedFile[];
}

interface VirtualFolder {
  name: string;
  parentPath: string | null;
  folderId?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; [key: string]: any };
    requestId?: string;
    uploadedFiles?: UploadedFile[];
    fileToFolderMap?: Record<string, string>;
    virtualFolders?: Record<string, string>;
  }
}

const uploadSessions = new Map<string, UploadSession>();

// --------------------- Helper Functions ---------------------

// Generate random filename to avoid collisions
const generateRandomFilename = (originalFilename: string): string => {
  const ext = path.extname(originalFilename).toLowerCase();
  const randomId = crypto.randomBytes(16).toString("hex");
  return `file-${randomId}${ext}`;
};

// Format unknown errors into readable message
const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

// Build a folder map from ZIP entries (used to create database folders)
const buildFolderHierarchy = (
  entries: AdmZip.IZipEntry[]
): Map<string, VirtualFolder> => {
  const folders = new Map<string, VirtualFolder>();

  // --- First Pass: Detect folders explicitly defined in ZIP
  entries.forEach((entry) => {
    if (!entry.isDirectory) return;

    const folderPath = entry.entryName.endsWith("/")
      ? entry.entryName.slice(0, -1)
      : entry.entryName;

    if (
      !folderPath ||
      folderPath.startsWith(".") ||
      folderPath.includes("/.") ||
      folderPath.startsWith("__")
    )
      return;

    const segments = folderPath.split("/");
    const name = segments[segments.length - 1];
    const parentPath =
      segments.length > 1 ? segments.slice(0, -1).join("/") : null;

    if (name.startsWith(".") || name.startsWith("__")) return;

    folders.set(folderPath, { name, parentPath });
  });

  // --- Second Pass: Infer folders from file paths
  entries.forEach((entry) => {
    if (entry.isDirectory) return;

    const entryName = entry.entryName;
    const baseName = path.basename(entryName);
    if (
      entryName.startsWith("__") ||
      baseName.startsWith(".") ||
      entryName.includes("/.") ||
      entry.header.size === 0
    )
      return;

    const dirPath = path.dirname(entryName);
    if (dirPath === "." || folders.has(dirPath)) return;

    const segments = dirPath.split("/");
    let currentPath = "";
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment || segment.startsWith(".") || segment.startsWith("__"))
        continue;

      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      if (!folders.has(currentPath)) {
        const parentPath = i > 0 ? segments.slice(0, i).join("/") : null;
        folders.set(currentPath, { name: segment, parentPath });
      }
    }
  });

  return folders;
};

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// --------------------- Multer Storage & Filters ---------------------

// Define how and where files should be saved
const storage: StorageEngine = multer.diskStorage({
  destination: async (req, _file, cb) => {
    try {
      const userId = req.user?.id;
      if (!userId) return cb(new Error("User not authenticated"), "");

      const uploadPath = getUserDirectoryPath(userId);
      if (!fs.existsSync(uploadPath))
        fs.mkdirSync(uploadPath, { recursive: true });

      // Initialize session but don't check file limits here - that's done in fileFilter
      const session = uploadSessions.get(req.requestId!) || {
        totalSize: 0,
        fileCount: 0,
        files: [],
      };
      uploadSessions.set(req.requestId!, session);
      cb(null, uploadPath);
    } catch (err) {
      cb(new Error(getErrorMessage(err)), "");
    }
  },
  filename: (_req, file, cb) => {
    const randomFilename = generateRandomFilename(file.originalname);
    cb(null, randomFilename);
  },
});

// File validation and upload limit checks
const fileFilter = async (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return cb(
        new ApiError(401, [{ authentication: "User not authenticated" }])
      );

    // Ensure requestId exists
    if (!req.requestId) {
      return cb(new ApiError(400, [{ request: "Missing request ID" }]));
    }

    const user = await userService.getUserById(userId);

    // Get fresh user data for each file to prevent race conditions
    const currentUser = await userService.getUserById(userId);
    const session = uploadSessions.get(req.requestId) || {
      totalSize: 0,
      fileCount: 0,
      files: [],
    };

    // Log file details and storage validation
    const actualAvailableStorage =
      currentUser.maxStorageLimit - currentUser.storageUsed;
    const isFit = file.size <= actualAvailableStorage;

    logger.info(`📁 File Upload Validation:
      File Name: ${file.originalname}
      Size: ${formatBytes(file.size)}
      Available Storage: ${formatBytes(actualAvailableStorage)}
      User Storage Used: ${formatBytes(currentUser.storageUsed)}
      User Storage Limit: ${formatBytes(currentUser.maxStorageLimit)}
      Fits in Storage: ${isFit ? "✅ Yes" : "❌ No"}
    `);

    // Double check storage limits with fresh data
    if (!isFit) {
      logger.warn(
        `❌ File "${file.originalname}" rejected - Exceeds available storage`
      );
      return cb(
        new ApiError(400, [
          {
            file: `File "${file.originalname}" (${formatBytes(file.size)}) exceeds available storage space (${formatBytes(actualAvailableStorage)}). File skipped.`,
          },
        ])
      );
    }

    // Check current upload batch file count limit
    if (session.fileCount >= MAX_FILES_PER_UPLOAD_BATCH) {
      return cb(
        new ApiError(400, [
          {
            file: `Maximum ${MAX_FILES_PER_UPLOAD_BATCH} files per upload batch exceeded. File "${file.originalname}" skipped.`,
          },
        ])
      );
    }

    // Check current upload batch size limit
    const newTotalSize = session.totalSize + file.size;
    if (newTotalSize > MAX_SIZE_PER_UPLOAD_BATCH) {
      logger.warn(`❌ File "${file.originalname}" rejected - Batch size limit exceeded
        Current Batch Size: ${formatBytes(session.totalSize)}
        This File Size: ${formatBytes(file.size)}
        New Total Size: ${formatBytes(newTotalSize)}
        Batch Size Limit: ${formatBytes(MAX_SIZE_PER_UPLOAD_BATCH)}
      `);
      return cb(
        new ApiError(400, [
          {
            file: `File "${file.originalname}" (${formatBytes(file.size)}) would exceed batch size limit of ${Math.floor(MAX_SIZE_PER_UPLOAD_BATCH / (1024 * 1024))}MB. File skipped.`,
          },
        ])
      );
    }

    logger.info(`✅ File "${file.originalname}" accepted - Adding to batch
      Current Batch Size: ${formatBytes(session.totalSize)}
      This File Size: ${formatBytes(file.size)}
      New Total Size: ${formatBytes(newTotalSize)}
      Files in Batch: ${session.fileCount + 1}
    `);

    session.totalSize = newTotalSize;
    session.fileCount++;
    uploadSessions.set(req.requestId!, session);

    cb(null, true);
  } catch (err) {
    cb(new ApiError(500, [{ server: getErrorMessage(err) }]));
  }
};

// Export multer instance with basic configuration
export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_SIZE_PER_UPLOAD_BATCH,
  },
}).array('files', MAX_FILES_PER_UPLOAD_BATCH);

// Handle aborted uploads and cleanup
export const handleAbortedUploads = (req: Request, res: Response, next: NextFunction) => {
    // Track if this was a real abort vs. connection issue
  let isRealAbort = false;
  
  // Handle actual client abort
  req.on('abort', () => {
    isRealAbort = true;
  });

  // Handle client disconnection
  req.on('close', async () => {
    // Only clean up if it was a real abort and we haven't sent headers yet
    if (isRealAbort && !res.headersSent) {
      logger.warn('Upload aborted by client - cleaning up...');
      await rollbackUploadedFiles(req);
    }
  });

  next();
};

// Validate storage limits before processing files
export const validateFileSize = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new ApiError(401, [{ authentication: "User not authenticated" }]));

    const files = req.files as Express.Multer.File[];
    if (!files || !Array.isArray(files) || files.length === 0) {
      return next(new ApiError(400, [{ file: "No files uploaded" }]));
    }

    const currentUser = await userService.getUserById(userId);
    const actualAvailableStorage = currentUser.maxStorageLimit - currentUser.storageUsed;

    // Calculate total size of all files in this batch
    const totalBatchSize = files.reduce((sum, file) => sum + file.size, 0);

    // Check if total batch size exceeds available storage
    if (totalBatchSize > actualAvailableStorage) {
      // Clean up uploaded files
      files.forEach(file => {
        try {
          fs.existsSync(file.path) && fs.unlinkSync(file.path);
        } catch (err) {
          logger.error(`Failed to clean up file ${file.path}:`, err);
        }
      });

      return next(new ApiError(400, [{
        file: `Total upload size (${formatBytes(totalBatchSize)}) exceeds available storage space (${formatBytes(actualAvailableStorage)}). Upload cancelled.`
      }]));
    }

    // Log validation details for each file
    files.forEach(file => {
      logger.info(`📁 File Upload Validation:
        File Name: ${file.originalname}
        Size: ${formatBytes(file.size)}
        Available Storage: ${formatBytes(actualAvailableStorage)}
        User Storage Used: ${formatBytes(currentUser.storageUsed)}
        User Storage Limit: ${formatBytes(currentUser.maxStorageLimit)}
        Fits in Storage: ✅ Yes
      `);
    });

    next();
  } catch (err) {
    // Clean up any uploaded files on error
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        try {
          fs.existsSync(file.path) && fs.unlinkSync(file.path);
        } catch (cleanupErr) {
          logger.error(`Failed to clean up file ${file.path}:`, cleanupErr);
        }
      });
    }
    next(new ApiError(500, [{ server: getErrorMessage(err) }]));
  }
};

// --------------------- ZIP File Extraction Handler ---------------------

// Extracts and organizes ZIP files, preserving folder structure
export const processZipFiles = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId || !req.files) return next();

    const files = req.files as Express.Multer.File[];
    // Only process ZIP files with the special prefix for folder uploads
    const zipFiles = files.filter(
      (file) =>
        file.originalname.toLowerCase().endsWith(".zip") &&
        file.originalname.startsWith(ZIP_NAME_PREFIX)
    );
    if (zipFiles.length === 0) {
      req.fileToFolderMap = req.fileToFolderMap || {};
      req.virtualFolders = req.virtualFolders || {};
      return next();
    }

    // Remove only the prefixed zip files from the files array
    req.files = files.filter(
      (file) =>
        !(
          file.originalname.toLowerCase().endsWith(".zip") &&
          file.originalname.startsWith(ZIP_NAME_PREFIX)
        )
    );

    const fileToFolderMap: Record<string, string> = {};
    const allVirtualFolders: Record<string, string> = {};

    for (const zipFile of zipFiles) {
      const zip = new AdmZip(zipFile.path);
      const entries = zip.getEntries();

      // Validate MAX_FILES_PER_FOLDER constraint for ZIP extraction
      const folderFileCount = new Map<string, number>();

      // Count files per folder in the ZIP
      entries.forEach((entry) => {
        if (entry.isDirectory) return;

        const entryName = entry.entryName;
        const baseName = path.basename(entryName);
        if (
          entryName.startsWith("__") ||
          baseName.startsWith(".") ||
          baseName === "Thumbs.db" ||
          entryName.includes("/.") ||
          entry.header.size === 0
        ) {
          return;
        }

        const dirPath = path.dirname(entryName);
        const folderKey = dirPath === "." ? "root" : dirPath;
        folderFileCount.set(
          folderKey,
          (folderFileCount.get(folderKey) || 0) + 1
        );
      });

      // Check if any folder exceeds the file limit
      for (const [folderPath, fileCount] of folderFileCount) {
        if (fileCount > MAX_FILES_PER_FOLDER) {
          throw new ApiError(400, [
            {
              folder: `Folder "${folderPath === "root" ? "root folder" : folderPath}" contains ${fileCount} files, which exceeds the maximum of ${MAX_FILES_PER_FOLDER} files per folder`,
            },
          ]);
        }
      }

      const folders = buildFolderHierarchy(entries);
      const virtualFolders: Record<string, string> = {};
      const extractedFiles: Express.Multer.File[] = [];

      // Create virtual folders in DB
      for (const folderPath of Array.from(folders.keys())) {
        const folder = folders.get(folderPath)!;
        let parentId = null;

        if (folder.parentPath) {
          parentId = virtualFolders[folder.parentPath];
        } else if (req.body.folderId) {
          // Validate folderId is a valid MongoDB ObjectId
          if (!Types.ObjectId.isValid(req.body.folderId)) {
            throw new ApiError(400, [{ folder: "Invalid folder ID format" }]);
          }
          parentId = req.body.folderId;
        }

        try {
          const newFolder = await folderService.createFolder(
            { name: folder.name, parent: parentId },
            userId
          );
          virtualFolders[folderPath] = newFolder.id;
          allVirtualFolders[folderPath] = newFolder.id;
        } catch (error) {
          if (error instanceof ApiError && error.statusCode === 409) {
            const existingFolder = await folderService.getFolderByNameAndParent(
              folder.name,
              parentId,
              userId
            );
            if (existingFolder) {
              virtualFolders[folderPath] = existingFolder.id;
              allVirtualFolders[folderPath] = existingFolder.id;
            }
          } else {
            throw error;
          }
        }
      }

      // Extract and prepare files
      for (const entry of entries) {
        if (entry.isDirectory) continue;

        const entryName = entry.entryName;
        const baseName = path.basename(entryName);
        if (
          entryName.startsWith("__") ||
          baseName.startsWith(".") ||
          baseName === "Thumbs.db" ||
          entryName.includes("/.") ||
          entry.header.size === 0
        ) {
          continue;
        }

        const dirPath = path.dirname(entry.entryName);
        const fileName = generateRandomFilename(path.basename(entry.entryName));
        const filePath = path.join(getUserDirectoryPath(userId), fileName);
        const fileData = entry.getData();
        fs.writeFileSync(filePath, fileData);

        const mimeType = mime.lookup(baseName) || "application/octet-stream";
        const extractedFile: Express.Multer.File = {
          fieldname: "file",
          originalname: baseName,
          encoding: "7bit",
          mimetype: mimeType,
          destination: getUserDirectoryPath(userId),
          filename: fileName,
          path: filePath,
          size: entry.header.size,
          buffer: fileData,
        } as Express.Multer.File;

        extractedFiles.push(extractedFile);

        const folderId = dirPath === "." ? null : virtualFolders[dirPath];
        if (folderId) fileToFolderMap[fileName] = folderId;
      }

      fs.unlinkSync(zipFile.path); // Delete uploaded ZIP file

      req.files = Array.isArray(req.files)
        ? [...req.files, ...extractedFiles]
        : [...Object.values(req.files || {}).flat(), ...extractedFiles];
    }

    req.fileToFolderMap = fileToFolderMap;
    req.virtualFolders = allVirtualFolders;

    next();
  } catch (error) {
    // Cleanup on failure
    if (req.files) {
      const filesToClean = Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat();
      for (const file of filesToClean) {
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (cleanupError) {
          logger.error("Error cleaning up file:", cleanupError);
        }
      }
    }
    next(error);
  }
};

// --------------------- Middleware: Update Storage Usage ---------------------

// Add size of uploaded files to user's storage usage
export const updateUserStorageUsage = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId || !req.files) return next();

    const files = req.files as Express.Multer.File[];

    // Calculate the actual storage size needed
    // Note: ZIP files are already removed from req.files by processZipFiles middleware
    // so we only count the final files that will be stored
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    logger.info(
      `📊 Storage check - User: ${userId}, Upload size: ${formatBytes(totalSize)}`
    );

    // Get current user to check storage limits
    const user = await userService.getUserById(userId);
    const newStorageUsed = user.storageUsed + totalSize;

    logger.info(
      `📊 Storage details - Current: ${formatBytes(user.storageUsed)}, Adding: ${formatBytes(totalSize)}, New total: ${formatBytes(newStorageUsed)}, Limit: ${formatBytes(user.maxStorageLimit)}`
    );
    logger.info(
      `📊 Available space: ${formatBytes(user.maxStorageLimit - user.storageUsed)}`
    );

    // Storage limit is already checked per-file in fileFilter, so we can safely update usage
    // Update storage usage
    await userService.updateUserStorageUsage(userId, totalSize);
    logger.debug(
      `Storage updated - Added: ${formatBytes(totalSize)}, New total: ${formatBytes(newStorageUsed)}`
    );
    next();
  } catch (error) {
    // Clean up uploaded files on error
    await rollbackUploadedFiles(req);
    next(error);
  }
};

// --------------------- Middleware: Rollback Handler ---------------------

// Delete uploaded files if DB or processing fails
export const rollbackUploadedFiles = async (req: Request) => {
  try {
    const userId = req.user?.id;
    if (!userId) return;

    // Get all files that need to be cleaned up
    const files = Array.isArray(req.files) 
      ? req.files 
      : req.files 
        ? Object.values(req.files).flat() 
        : [];

    logger.info(`🧹 Starting cleanup for aborted/failed upload - ${files.length} files`);

    // Delete each file
    for (const file of files) {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          logger.info(`✅ Cleaned up file: ${file.filename}`);
        }
      } catch (err) {
        logger.error(`❌ Failed to delete file ${file.path}:`, err);
      }
    }

    // Clean up session
    if (req.requestId) {
      uploadSessions.delete(req.requestId);
      logger.info(`✅ Cleaned up upload session: ${req.requestId}`);
    }

    // Clean up any temporary files in the user's directory
    const userDir = getUserDirectoryPath(userId);
    if (fs.existsSync(userDir)) {
      const currentFiles = fs.readdirSync(userDir);
      const now = Date.now();
      
      // Clean up any files that are incomplete/temporary (modified in the last minute)
      for (const file of currentFiles) {
        try {
          const filePath = path.join(userDir, file);
          const stats = fs.statSync(filePath);
          
          // If file was modified in the last minute, it might be from this aborted upload
          if (now - stats.mtimeMs < 60000) {
            fs.unlinkSync(filePath);
            logger.info(`✅ Cleaned up potentially incomplete file: ${file}`);
          }
        } catch (err) {
          logger.error(`❌ Error checking/cleaning temporary file:`, err);
        }
      }
    }

    logger.info('🧹 Upload cleanup completed');
  } catch (error) {
    logger.error("❌ Error in rollbackUploadedFiles:", error);
  }
};

// Add requestId middleware to ensure each request has a unique ID
export const addRequestId = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  req.requestId = crypto.randomBytes(16).toString("hex");
  next();
};
