import { ApiError } from "@utils/apiError.utils.js";
import logger from "@utils/logger.utils.js";
import { NextFunction, Request, Response } from "express";
import fs from "fs";
import { encryptFileBuffer } from "@utils/cryptoUtil.utils.js";

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

    // Add to request logs if available
    if (req.addLog) {
      req.addLog("FileEncryption", "INFO", `Beginning encryption of ${files.length} files`);
    }

    // Encrypt each file
    for (const file of files) {
      try {
        const filePath = file.path;
        const fileBuffer = await fs.promises.readFile(filePath);
        
        // Pass the request object to encryptFileBuffer for detailed logging
        const encryptedBuffer = encryptFileBuffer(fileBuffer, userId, req);
        await fs.promises.writeFile(filePath, encryptedBuffer);

        logger.info(`Encrypted file: ${file.filename}`);
        
        // Add to request logs if available
        if (req.addLog) {
          req.addLog("FileEncryption", "INFO", `Encrypted file: ${file.filename}, size: ${fileBuffer.length} bytes → ${encryptedBuffer.length} bytes`);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to encrypt file ${file.filename}:`, errMsg);
        
        // Add to request logs if available
        if (req.addLog) {
          req.addLog("FileEncryption", "ERROR", `Failed to encrypt file ${file.filename}: ${errMsg}`);
        }
        // Continue processing other files
      }
    }

    next();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error("Error in file encryption middleware:", errMsg);
    
    // Add to request logs if available
    if (req.addLog) {
      req.addLog("FileEncryption", "ERROR", `Error in encryption middleware: ${errMsg}`);
    }
    
    next(new ApiError(500, [{ server: "Error processing files" }]));
  }
};
