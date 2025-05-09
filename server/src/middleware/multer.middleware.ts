import userService from "@api/user/user.service.js";
import folderService from "@api/Folder/folder.service.js";
import {
  MAX_FILES_PER_FOLDER,
  MAX_FILES_PER_UPLOAD_BATCH,
  MAX_SIZE_PER_UPLOAD_BATCH,
  UPLOADS_DIR,
  ZIP_NAME_PREFIX,
} from "@config/constants.js";
import { ApiError } from "@utils/apiError.js";
import logger from "@utils/logger.js";
import { getUserDirectoryPath } from "@utils/mkdir.utils.js";
import AdmZip from "adm-zip";
import crypto from "crypto";
import fs from "fs";
import multer, { FileFilterCallback, StorageEngine } from "multer";
import path from "path";
import { Request, Response, NextFunction } from "express";

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
  path: string; // Full path from ZIP root
  parentPath: string | null; // Parent folder path
  folderId?: string; // MongoDB ID once created
}

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; [key: string]: any };
    requestId?: string;
    uploadedFiles?: UploadedFile[];
    fileToFolderMap?: Record<string, string>;
    virtualFolders?: Record<string, string>; // path -> folderId mapping
  }
}

const uploadSessions = new Map<string, UploadSession>();
export const fileToFolderMap: Record<string, string> = {};

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
 * 
 * @param entries ZIP entries from AdmZip
 * @returns Map of folder paths and folder objects
 */
const buildFolderHierarchy = (entries: AdmZip.IZipEntry[]): Map<string, VirtualFolder> => {
  const folders = new Map<string, VirtualFolder>();
  
  // First pass: identify all folders
  entries.forEach(entry => {
    // Skip files and junk entries
    if (!entry.isDirectory) return;
    
    const folderPath = entry.entryName.endsWith('/') 
      ? entry.entryName.slice(0, -1)  // Remove trailing slash
      : entry.entryName;
    
    // Skip hidden or system folders
    if (
      folderPath.startsWith('__') || 
      folderPath.startsWith('.') || 
      folderPath.includes('/.') || 
      folderPath === ''
    ) {
      return;
    }
    
    // Get folder name (last segment of path)
    const segments = folderPath.split('/');
    const name = segments[segments.length - 1];
    
    // Get parent path
    const parentPath = segments.length > 1 
      ? segments.slice(0, -1).join('/')
      : null;
    
    // Add folder to map
    folders.set(folderPath, {
      name,
      path: folderPath,
      parentPath
    });
  });
  
  // Second pass: extract folders from file paths that might not have explicit directory entries
  entries.forEach(entry => {
    if (entry.isDirectory) return; // Skip directories we've already processed
    
    // Get directory path from file path
    const dirPath = path.dirname(entry.entryName);
    if (dirPath === '.' || folders.has(dirPath)) return; // Skip root level or existing folders
    
    // Split into path segments
    const segments = dirPath.split('/');
    
    // Create each folder in path that doesn't exist yet
    let currentPath = '';
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Skip empty segments or hidden folders
      if (!segment || segment.startsWith('.') || segment.startsWith('__')) continue;
      
      // Build current path
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      
      // If this path doesn't exist in our folder map, add it
      if (!folders.has(currentPath)) {
        const parentPath = i > 0 ? segments.slice(0, i).join('/') : null;
        
        folders.set(currentPath, {
          name: segment,
          path: currentPath,
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
        return cb(new Error("Folder file limit exceeded"), "");
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
    if (!userId) return cb(new ApiError(401, "User not authenticated"));

    const user = await userService.getUserById(userId);
    const session = uploadSessions.get(req.requestId!) || {
      totalSize: 0,
      fileCount: 0,
      files: [],
    };

    const totalSize = user.storageUsed + session.totalSize + file.size;
    if (typeof user.plan === "object" && totalSize > user.plan.storageLimit)
      return cb(new ApiError(413, "Storage limit exceeded"));
    if (session.fileCount + 1 > MAX_FILES_PER_UPLOAD_BATCH)
      return cb(new ApiError(413, "File count limit exceeded"));

    if (session.totalSize + file.size > MAX_SIZE_PER_UPLOAD_BATCH)
      return cb(new ApiError(413, "Batch size limit exceeded"));

    session.totalSize += file.size;
    session.fileCount += 1;
    uploadSessions.set(req.requestId!, session);

    cb(null, true);
  } catch (err) {
    cb(new ApiError(500, getErrorMessage(err)));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_PER_UPLOAD_BATCH },
});

// Middleware: process ZIP files
export const processZipFiles = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const files: Express.Multer.File[] = Array.isArray(req.files)
      ? req.files
      : req.file
        ? [req.file]
        : [];
    const session = uploadSessions.get(req.requestId!);
    
    // Store mapping of virtual folder paths to MongoDB folder IDs
    const virtualFoldersMap: Record<string, string> = {};
    req.virtualFolders = virtualFoldersMap;

    for (const file of files) {
      if (
        file.originalname.endsWith(".zip") && 
        file.originalname.startsWith(ZIP_NAME_PREFIX)
      ) {
        const zipPath = path.join(file.destination, file.filename);
        const zip = new AdmZip(zipPath);
        const entries = zip.getEntries();
        
        // Process the folder structure first
        if (req.user?.id) {
          const userId = req.user.id;
          const folderId = req.body.folderId || null;  // Parent folder ID from request
          
          // Extract folder hierarchy from zip entries
          const folderHierarchy = buildFolderHierarchy(entries);
          
          // Create folders in MongoDB in the correct order (parents first)
          // Need to sort by path depth to ensure parent folders are created before their children
          const sortedFolders = Array.from(folderHierarchy.values())
            .sort((a, b) => {
              return (a.path?.split('/').length || 0) - (b.path?.split('/').length || 0);
            });
            
          for (const folder of sortedFolders) {
            try {
              // Determine the parent folder ID
              let parentId = folderId;
              
              // If this folder has a parent path in the ZIP, use its MongoDB ID
              if (folder.parentPath && virtualFoldersMap[folder.parentPath]) {
                parentId = virtualFoldersMap[folder.parentPath];
              }
              
              // Create folder in MongoDB
              const newFolder = await folderService.createFolder(
                { 
                  name: folder.name,
                  parent: parentId
                },
                userId
              );
              
              // Store the mapping from virtual path to MongoDB folder ID
              virtualFoldersMap[folder.path] = newFolder.id;
              
              // If this is the root folder of a file's path, store its ID for direct lookup in the controller
              Object.keys(fileToFolderMap).forEach(filename => {
                if (fileToFolderMap[filename] === folder.path) {
                  logger.debug(`Associating file ${filename} with folder ${newFolder.id} at path ${folder.path}`);
                }
              });
              
              logger.debug(`Created virtual folder: ${folder.path} -> ${newFolder.id}`);
            } catch (folderError) {
              logger.error(`Error creating folder ${folder.path}:`, folderError);
              // Continue processing other folders
            }
          }
        }
        
        // Now process files
        for (const entry of entries) {
          const entryName = entry.entryName;
          const baseName = path.basename(entryName);

          // Skip directories
          if (entry.isDirectory) continue;

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

          // Generate a completely random filename for the extracted file
          const randomFilename = generateRandomFilename(entry.entryName);
          
          // Extract the file
          zip.extractEntryTo(
            entry.entryName,
            file.destination,
            false,
            true,
            false,
            randomFilename
          );
          
          // Get the directory path for this file from the zip
          const dirPath = path.dirname(entry.entryName);
          
          // Store the original path for later reference
          fileToFolderMap[randomFilename] = dirPath;

          // Make sure we have a session
          if (!session) {
            logger.error(`No upload session found for request ID ${req.requestId}`);
            continue;
          }
          
          // Add the extracted file to the session files list so it gets processed by the controller
          session.files.push({
            originalname: baseName, // Keep track of original name for reference
            filename: randomFilename,
            size: entry.header.size,
            destination: file.destination,
          });
        }
        
        // Delete the original ZIP file as we've extracted its contents
        fs.unlinkSync(zipPath);
        
        logger.info(`Processed ZIP file with ${Object.keys(virtualFoldersMap).length} folders extracted`);
      } else {
        // Regular file upload (not a ZIP)
        session?.files.push({
          originalname: file.originalname,
          filename: file.filename,
          size: file.size,
          destination: file.destination,
        });
      }
    }

    next();
  } catch (err) {
    logger.error("ZIP processing error:", err);
    next(new ApiError(500, getErrorMessage(err)));
  }
};

// Middleware: update user storage
export const updateUserStorageUsage = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const session = uploadSessions.get(req.requestId!);
    const totalAdded = session?.files.reduce((sum, f) => sum + f.size, 0) || 0;

    if (totalAdded > 0) {
      await userService.updateUserStorageUsage(req.user!.id, totalAdded);
    }

    req.uploadedFiles = session?.files || [];
    req.fileToFolderMap = fileToFolderMap;
    
    // Update req.files with extracted files so they get processed by the controller
    if (req.files && Array.isArray(req.files) && session?.files) {
      // Create list of original ZIP files to be excluded
      const zipFilenames = (req.files as Express.Multer.File[])
        .filter(f => f.originalname.endsWith('.zip') && f.originalname.startsWith(ZIP_NAME_PREFIX))
        .map(f => f.filename);
      
      // Filter out the original ZIP files from current files array
      const filteredOriginalFiles = (req.files as Express.Multer.File[])
        .filter(f => !zipFilenames.includes(f.filename));
      
      // Add the extracted files from the session to req.files
      // This ensures the controller processes both original and extracted files
      const extractedFiles = session.files.map(f => ({
        originalname: f.originalname,
        filename: f.filename,
        size: f.size,
        destination: f.destination,
        path: path.join(f.destination, f.filename),
        mimetype: ''  // Could be determined from extension if needed
      } as Express.Multer.File));
      
      // Log information about extracted files
      logger.debug(`Adding ${extractedFiles.length} extracted files to req.files for processing`);
      extractedFiles.forEach(f => {
        logger.debug(`Extracted file: ${f.filename}, original name: ${f.originalname}, virtual path: ${fileToFolderMap[f.filename] || 'none'}`);
      });
      
      req.files = [
        ...filteredOriginalFiles,
        ...extractedFiles
      ];
    }
    
    uploadSessions.delete(req.requestId!);

    next();
  } catch (err) {
    logger.error("Update storage error:", err);
    next(new ApiError(500, getErrorMessage(err)));
  }
};

// Rollback utility
export const rollbackUploadedFiles = async (req: Request) => {
  try {
    const files = req.uploadedFiles || [];
    files.forEach((file) => {
      const filePath = path.join(file.destination, file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  } catch (err) {
    logger.error("Rollback cleanup error:", err);
  }
};
