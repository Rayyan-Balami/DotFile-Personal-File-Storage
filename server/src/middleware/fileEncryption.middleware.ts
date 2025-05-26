import { ApiError } from "@utils/apiError.utils.js";
import { encryptFileBuffer } from "@utils/cryptoUtil.utils.js";
import logger from "@utils/logger.utils.js";
import { NextFunction, Request, Response } from "express";
import fs from "fs";

/**
 * Middleware: Encrypt uploaded files before DB entry
 * Ensures all files are securely stored on disk using user-based encryption
 */
export const encryptFiles = async (
  req: Request, 
  _res: Response, 
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    // Skip if user or files are missing
    if (!userId || !req.files) return next();

    // Normalize files into array
    const files = Array.isArray(req.files)
      ? req.files
      : req.files?.files
      ? Array.isArray(req.files.files)
        ? req.files.files
        : Object.values(req.files).flat()
      : [];

    // Skip if no files to process
    if (files.length === 0) return next();

    // Encrypt each file
    for (const file of files) {
      try {
        const filePath = file.path;
        const fileBuffer = await fs.promises.readFile(filePath);
        const encryptedBuffer = encryptFileBuffer(fileBuffer, userId);
        await fs.promises.writeFile(filePath, encryptedBuffer);

        logger.info(`Encrypted file: ${file.filename}`);
      } catch (error) {
        logger.error(`Failed to encrypt file ${file.filename}:`, error);
        // Continue processing other files
      }
    }

    next();
  } catch (error) {
    logger.error("Error in file encryption middleware:", error);
    next(new ApiError(500, [{ server: "Error processing files" }]));
  }
};
