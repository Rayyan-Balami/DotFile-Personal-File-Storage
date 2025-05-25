import folderService from "@api/folder/folder.service.js";
import userService from "@api/user/user.service.js";
import {
  MAX_FILES_PER_FOLDER,
  MAX_FILES_PER_UPLOAD_BATCH,
  MAX_SIZE_PER_UPLOAD_BATCH,
  UPLOADS_DIR
} from "@config/constants.js";
import { ApiError } from "@utils/apiError.utils.js";
import logger from "@utils/logger.utils.js";
import { getUserDirectoryPath } from "@utils/mkdir.utils.js";
import { encryptFileBuffer } from "@utils/cryptoUtil.utils.js"; // Add import for encryption
import AdmZip from "adm-zip";
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import fs from "fs";
import multer, { FileFilterCallback, StorageEngine } from "multer";
import path from "path";
import mime from "mime-types";

// Types
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

// Extended type for extracting virtual folder structure from ZIP
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

// Generate a completely random filename with the original extension
const generateRandomFilename = (originalFilename: string): string => {
  const ext = path.extname(originalFilename).toLowerCase();
  const randomId = crypto.randomBytes(16).toString("hex");
  return `file-${randomId}${ext}`;
};

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

/**
 * Build a folder hierarchy from ZIP entries
 * This creates a map of folder paths and their metadata
 */
const buildFolderHierarchy = (entries: AdmZip.IZipEntry[]): Map<string, VirtualFolder> => {
  const folders = new Map<string, VirtualFolder>();
  
  // First pass: identify all folders
  entries.forEach(entry => {
    if (!entry.isDirectory) return;
    
    const folderPath = entry.entryName.endsWith('/') 
      ? entry.entryName.slice(0, -1)
      : entry.entryName;

    // Skip empty paths
    if (folderPath === '') return;

    // Skip system/hidden folders
    if (
      folderPath.startsWith('__') ||                      // __MACOSX, __something
      folderPath.startsWith('.') ||                       // .git, .hidden
      folderPath.includes('/.') ||                        // any hidden folder in path
      folderPath.includes('/__')                          // any system folder in path
    ) {
      return;
    }
    
    // Get folder name and parent path
    const segments = folderPath.split('/');
    const name = segments[segments.length - 1];

    // Skip if folder name is a system or hidden folder
    if (
      name.startsWith('.') ||
      name.startsWith('__') ||
      name === 'Thumbs.db' ||
      name === '.DS_Store'
    ) {
      return;
    }

    const parentPath = segments.length > 1 
      ? segments.slice(0, -1).join('/')
      : null;
    
    folders.set(folderPath, { name, parentPath });
  });
  
  // Second pass: extract folders from file paths
  entries.forEach(entry => {
    if (entry.isDirectory) return;

    const entryName = entry.entryName;
    const baseName = path.basename(entryName);

    // Skip system/hidden files
    if (
      entryName.startsWith('__') ||                      // __MACOSX, __something
      baseName.startsWith('._') || baseName.startsWith('.') || // ._nepal.jpg, .hidden
      baseName === 'Thumbs.db' || baseName === '.DS_Store' ||  // known junk files
      entryName.includes('/.') ||                       // any hidden folder
      entry.header.size === 0                           // empty files
    ) {
      return;
    }
    
    const dirPath = path.dirname(entry.entryName);
    if (dirPath === '.' || folders.has(dirPath)) return;
    
    const segments = dirPath.split('/');
    let currentPath = '';
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Skip empty segments or system/hidden folders
      if (
        !segment ||
        segment.startsWith('.') ||
        segment.startsWith('__') ||
        segment === 'Thumbs.db' ||
        segment === '.DS_Store'
      ) {
        continue;
      }
      
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      
      if (!folders.has(currentPath)) {
        const parentPath = i > 0 ? segments.slice(0, i).join('/') : null;
        folders.set(currentPath, {
          name: segment,
          parentPath
        });
      }
    }
  });
  
  return folders;
};

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer storage
const storage: StorageEngine = multer.diskStorage({
  destination: async (req, _file, cb) => {
    try {
      const userId = req.user?.id;
      if (!userId) return cb(new Error("User not authenticated"), "");
      const uploadPath = getUserDirectoryPath(userId);
      if (!fs.existsSync(uploadPath))
        fs.mkdirSync(uploadPath, { recursive: true });

      const filesInFolder = fs.readdirSync(uploadPath).length;
      const session = uploadSessions.get(req.requestId!) || {
        totalSize: 0,
        fileCount: 0,
        files: [],
      };

      if (filesInFolder + session.fileCount >= MAX_FILES_PER_FOLDER) {
        return cb(new Error("Storage limit exceeded, Buy more"), "");
      }

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

// File filter
const fileFilter = async (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return cb(new ApiError(401, [{ authentication: "User not authenticated" }]));

    const user = await userService.getUserById(userId);
    const session = uploadSessions.get(req.requestId!) || {
      totalSize: 0,
      fileCount: 0,
      files: [],
    };

    // Check file count limit
    if (session.fileCount >= MAX_FILES_PER_UPLOAD_BATCH) {
      return cb(
        new ApiError(400, [
          { files: `Maximum ${MAX_FILES_PER_UPLOAD_BATCH} files per upload` },
        ])
      );
    }

    // Check total upload size limit
    const newTotalSize = session.totalSize + file.size;
    if (newTotalSize > MAX_SIZE_PER_UPLOAD_BATCH) {
      return cb(
        new ApiError(400, [
          {
            files: `Total upload size cannot exceed ${Math.floor(
              MAX_SIZE_PER_UPLOAD_BATCH / (1024 * 1024)
            )}MB`,
          },
        ])
      );
    }

    // Update session
    session.totalSize = newTotalSize;
    session.fileCount++;
    uploadSessions.set(req.requestId!, session);

    cb(null, true);
  } catch (err) {
    cb(new ApiError(500, [{ server: getErrorMessage(err) }]));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_PER_UPLOAD_BATCH,
  },
});

export const processZipFiles = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId || !req.files) return next();

    const files = req.files as Express.Multer.File[];
    const zipFiles = files.filter((file) =>
      file.originalname.toLowerCase().endsWith(".zip")
    );

    if (zipFiles.length === 0) {
      // Initialize these properties even if no zip files
      req.fileToFolderMap = req.fileToFolderMap || {};
      req.virtualFolders = req.virtualFolders || {};
      return next();
    }

    // Remove ZIP files from req.files so they don't get saved to the database
    req.files = files.filter(file => !file.originalname.toLowerCase().endsWith(".zip"));

    // Create local maps for this request
    const fileToFolderMap: Record<string, string> = {};
    
    // Process each ZIP file
    for (const zipFile of zipFiles) {
      const zip = new AdmZip(zipFile.path);
      const entries = zip.getEntries();

      // Build folder hierarchy
      const folders = buildFolderHierarchy(entries);
      const virtualFolders: Record<string, string> = {};
      const extractedFiles: Express.Multer.File[] = [];

      // Create folders in order (parents first)
      const folderPaths = Array.from(folders.keys());
      for (const folderPath of folderPaths) {
        const folder = folders.get(folderPath)!;
        const parentId = folder.parentPath ? virtualFolders[folder.parentPath] : null;

        try {
          // Create folder in database
          const newFolder = await folderService.createFolder(
            {
              name: folder.name,
              parent: parentId,
            },
            userId
          );

          virtualFolders[folderPath] = newFolder.id;
        } catch (error) {
          // If folder already exists, try to get its ID
          if (error instanceof ApiError && error.statusCode === 409) {
            const existingFolder = await folderService.getFolderByNameAndParent(
              folder.name,
              parentId,
              userId
            );
            if (existingFolder) {
              virtualFolders[folderPath] = existingFolder.id;
            }
          } else {
            throw error;
          }
        }
      }

      // Extract files
      for (const entry of entries) {
        if (entry.isDirectory) continue;

        const entryName = entry.entryName;
        const baseName = path.basename(entryName);

        // Skip system/hidden folders or files
        if (
          entryName.startsWith('__') ||                      // __MACOSX, __something
          baseName.startsWith('._') || baseName.startsWith('.') || // ._nepal.jpg, .hidden
          baseName === 'Thumbs.db' || baseName === '.DS_Store' ||  // known junk files
          entryName.includes('/.') ||                       // any hidden folder
          entry.header.size === 0                           // empty files
        ) {
          continue;
        }

        const dirPath = path.dirname(entry.entryName);
        const fileName = generateRandomFilename(path.basename(entry.entryName));
        const filePath = path.join(getUserDirectoryPath(userId), fileName);

        // Extract file synchronously
        const fileData = entry.getData();
        fs.writeFileSync(filePath, fileData);

        // Create a multer file object for the extracted file
        // Detect MIME type from file extension, fallback to application/octet-stream
        const mimeType = mime.lookup(baseName) || 'application/octet-stream';
        
        const extractedFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: baseName,
          encoding: '7bit',
          mimetype: mimeType,
          destination: getUserDirectoryPath(userId),
          filename: fileName,
          path: filePath,
          size: entry.header.size,
          buffer: fileData
        } as Express.Multer.File;

        extractedFiles.push(extractedFile);

        // Map file to its folder ID, not the path
        const folderId = dirPath === "." ? null : virtualFolders[dirPath];
        if (folderId) {
          fileToFolderMap[fileName] = folderId; // Store the folder ID instead of the path
        }
      }

      // Clean up the original ZIP file
      fs.unlinkSync(zipFile.path);

      // Add extracted files to req.files
      req.files = Array.isArray(req.files) 
        ? [...req.files, ...extractedFiles]
        : [...(Object.values(req.files || {}).flat()), ...extractedFiles];

      // Store mappings in request for file service to use
      req.fileToFolderMap = fileToFolderMap;
      req.virtualFolders = virtualFolders;
    }

    next();
  } catch (error) {
    // Clean up any extracted files if there's an error
    if (req.files) {
      const filesToClean = Array.isArray(req.files) 
        ? req.files 
        : Object.values(req.files).flat();
        
      for (const file of filesToClean) {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          logger.error('Error cleaning up file:', cleanupError);
        }
      }
    }
    next(error);
  }
};

export const updateUserStorageUsage = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId || !req.files) return next();

    const files = req.files as Express.Multer.File[];
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    await userService.updateUserStorageUsage(userId, totalSize);
    next();
  } catch (error) {
    next(error);
  }
};

export const rollbackUploadedFiles = async (req: Request) => {
  try {
    const userId = req.user?.id;
    if (!userId || !req.files) return;

    const files = req.files as Express.Multer.File[];
    for (const file of files) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        logger.error(`Failed to delete file ${file.path}:`, err);
      }
    }

    // Clear upload session
    if (req.requestId) {
      uploadSessions.delete(req.requestId);
    }
  } catch (error) {
    logger.error("Error in rollbackUploadedFiles:", error);
  }
};