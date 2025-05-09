import userService from "@api/user/user.service.js";
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

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; [key: string]: any };
    requestId?: string;
    uploadedFiles?: UploadedFile[];
    fileToFolderMap?: Record<string, string>;
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

    for (const file of files) {
      if (
        file.originalname.endsWith(".zip") && 
        file.originalname.startsWith(ZIP_NAME_PREFIX)
      ) {
        const zip = new AdmZip(path.join(file.destination, file.filename));
        const entries = zip.getEntries();

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

          zip.extractEntryTo(
            entry.entryName,
            file.destination,
            false,
            true,
            false,
            randomFilename
          );
          fileToFolderMap[randomFilename] = path.dirname(entry.entryName);

          session?.files.push({
            originalname: baseName, // Keep track of original name for reference
            filename: randomFilename,
            size: entry.header.size,
            destination: file.destination,
          });
        }
        fs.unlinkSync(path.join(file.destination, file.filename)); // Delete original ZIP
      } else {
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
