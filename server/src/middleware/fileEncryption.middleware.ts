import { NextFunction, Request, Response } from "express";
import fs from "fs";
import { encryptFileBuffer } from "@utils/cryptoUtil.utils.js";
import { getUserDirectoryPath } from "@utils/mkdir.utils.js";
import logger from "@utils/logger.utils.js";
import { ApiError } from "@utils/apiError.utils.js";

/**
 * Middleware to encrypt files after upload but before saving to database
 * This ensures files are stored encrypted on disk
 */
export const encryptFiles = async (
  req: Request, 
  _res: Response, 
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId || !req.files) {
      return next();
    }

    // Get all files from request (handle array or object formats)
    const files = Array.isArray(req.files) ? req.files : 
                 (req.files ? Array.isArray(req.files.files) ? req.files.files : 
                 Object.values(req.files).flat() : []);

    if (files.length === 0) {
      return next();
    }
    
    // Process each file
    for (const file of files) {
      try {
        // Full path to the file
        const filePath = file.path;
        
        // Read the file
        const fileBuffer = await fs.promises.readFile(filePath);
        
        // Encrypt the file
        const encryptedBuffer = encryptFileBuffer(fileBuffer, userId);
        
        // Save the encrypted file back to disk
        await fs.promises.writeFile(filePath, encryptedBuffer);
        
        logger.info(`Encrypted file: ${file.filename}`);
      } catch (error) {
        logger.error(`Failed to encrypt file ${file.filename}:`, error);
        // Continue with other files even if one fails
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error in file encryption middleware:', error);
    next(new ApiError(500, [{ server: "Error processing files" }]));
  }
};
