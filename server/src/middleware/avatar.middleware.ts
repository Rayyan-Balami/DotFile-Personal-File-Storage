// Avatar Upload Middleware - Handles user avatar uploads with validation and cleanup

import { AVATARS_DIR, MAX_AVATAR_SIZE, DEFAULT_USER_AVATAR_URL } from "@config/constants.js";
import { ApiError } from "@utils/apiError.utils.js";
import logger from "@utils/logger.utils.js";
import { formatBytes } from "@utils/formatBytes.utils.js";
import { Request, Response } from "express";
import fs from "fs";
import multer, { FileFilterCallback, StorageEngine } from "multer";
import path from "path";

// --------------------- Types & Declarations ---------------------

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; [key: string]: any };
    avatarFile?: Express.Multer.File;
  }
}

// --------------------- Helper Functions ---------------------

// Generate user-specific avatar filename
const generateAvatarFilename = (userId: string, originalFilename: string): string => {
  const ext = path.extname(originalFilename).toLowerCase();
  return `user-${userId}${ext}`;
};

// Format unknown errors into readable message
const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

// Check if image type is allowed
const isAllowedImageType = (mimetype: string): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff'
  ];
  return allowedTypes.includes(mimetype.toLowerCase());
};

// Ensure avatars directory exists
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

// --------------------- Multer Storage & Filters ---------------------

// Define how and where avatar files should be saved
const avatarStorage: StorageEngine = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const userId = req.user?.id;
      if (!userId) return cb(new Error("User not authenticated"), "");

      if (!fs.existsSync(AVATARS_DIR)) {
        fs.mkdirSync(AVATARS_DIR, { recursive: true });
      }

      cb(null, AVATARS_DIR);
    } catch (err) {
      cb(new Error(getErrorMessage(err)), "");
    }
  },
  filename: (req, file, cb) => {
    try {
      const userId = req.user?.id;
      if (!userId) return cb(new Error("User not authenticated"), "");

      const avatarFilename = generateAvatarFilename(userId, file.originalname);
      cb(null, avatarFilename);
    } catch (err) {
      cb(new Error(getErrorMessage(err)), "");
    }
  },
});

// File validation for avatar uploads
const avatarFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return cb(
        new ApiError(401, [{ authentication: "User not authenticated" }])
      );
    }

    // Check if file is an image
    if (!isAllowedImageType(file.mimetype)) {
      logger.warn(`❌ Avatar upload rejected - Invalid file type: ${file.mimetype}`);
      return cb(
        new ApiError(400, [
          {
            avatar: `File type "${file.mimetype}" is not allowed. Please upload a valid image file (JPEG, PNG, GIF, WebP, BMP, or TIFF).`,
          },
        ])
      );
    }

    // Check file size
    if (file.size > MAX_AVATAR_SIZE) {
      logger.warn(`❌ Avatar upload rejected - File too large: ${formatBytes(file.size)}`);
      return cb(
        new ApiError(400, [
          {
            avatar: `File size (${formatBytes(file.size)}) exceeds the maximum allowed size of ${formatBytes(MAX_AVATAR_SIZE)}.`,
          },
        ])
      );
    }

    logger.info(`✅ Avatar upload accepted:
      User ID: ${userId}
      File Name: ${file.originalname}
      File Type: ${file.mimetype}
      Size: ${formatBytes(file.size)}
    `);

    cb(null, true);
  } catch (err) {
    cb(new ApiError(500, [{ server: getErrorMessage(err) }]));
  }
};

// Export avatar multer instance
export const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: MAX_AVATAR_SIZE,
    files: 1, // Only allow one avatar file at a time
  },
}).single('avatar'); // Field name should be 'avatar'

// --------------------- Helper: Delete Avatar File ---------------------

// Helper function to delete an avatar file (exported for use in services)
export const deleteAvatarFile = async (avatarUrl: string): Promise<void> => {
  console.log(`🗑️ Attempting to delete avatar file: ${avatarUrl}`);
  try {
    // Don't delete the default avatar
    if (avatarUrl === DEFAULT_USER_AVATAR_URL || !avatarUrl) {
      return;
    }

    // Extract filename from URL (e.g., "/avatars/user-123.jpg" -> "user-123.jpg")
    const filename = path.basename(avatarUrl);
    const filePath = path.join(AVATARS_DIR, filename);

    // Check if file exists and delete it
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logger.info(`✅ Deleted old avatar file: ${filename}`);
    }
  } catch (error) {
    logger.error(`❌ Failed to delete avatar file ${avatarUrl}:`, error);
    // Don't throw error as this is cleanup - log and continue
  }
};

// --------------------- Rollback Handler ---------------------

// Delete uploaded avatar file if processing fails
export const rollbackAvatarUpload = async (req: Request) => {
  try {
    const file = req.file;
    if (!file) return;

    logger.info(`🧹 Cleaning up failed avatar upload: ${file.filename}`);

    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
      logger.info(`✅ Cleaned up avatar file: ${file.filename}`);
    }
  } catch (error) {
    logger.error("❌ Error in rollbackAvatarUpload:", error);
  }
};
