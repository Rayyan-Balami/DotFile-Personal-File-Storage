import { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import logger from "@utils/logger.utils.js";
import { ApiError } from "@utils/apiError.utils.js";
import { getUserPreviewsDirectoryPath, getFilePathFromStorageKey, getPreviewPathFromStorageKey } from "@utils/mkdir.utils.js";
import { encryptFileBuffer, decryptFileBuffer } from "@utils/cryptoUtil.utils.js";
import { compressBuffer, decompressBuffer } from "@utils/huffmanCompression.utils.js";
import { isPreviewSupported } from "@utils/previewGenerator.utils.js";

/**
 * Supported file types for preview generation
 */
const PREVIEW_SUPPORTED_TYPES = [
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
  // Text files
  '.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts',
  // Documents (basic text extraction)
  '.log', '.yaml', '.yml', '.ini', '.conf', '.config',
];

/**
 * Image file extensions that can be processed directly
 */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

/**
 * Text file extensions that need text-to-image conversion
 */
const TEXT_EXTENSIONS = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts', '.log', '.yaml', '.yml', '.ini', '.conf', '.config'];

/**
 * Simple image resizing function (creates a smaller version)
 * This is a basic implementation - in production, use a proper image library
 */
function resizeImage(inputBuffer: Buffer, maxWidth: number = 300, maxHeight: number = 300): Buffer {
  // For now, just return the original buffer
  // In production, you'd use sharp, jimp, or similar library
  logger.debug(`Image resizing not implemented, returning original for preview`);
  return inputBuffer;
}

/**
 * Generate a text preview image from text content
 * Creates a simple image with text content for preview
 */
function generateTextPreview(textContent: string, maxLines: number = 10): Buffer {
  // Simple text preview - just truncate the text
  // In production, you'd create an actual image from the text
  const lines = textContent.split('\n').slice(0, maxLines);
  const previewText = lines.join('\n');
  const truncatedText = previewText.length > 500 ? previewText.substring(0, 500) + '...' : previewText;
  
  logger.debug(`Generated text preview: ${truncatedText.length} characters`);
  return Buffer.from(truncatedText, 'utf-8');
}

/**
 * Generate a preview for a single file
 */
async function generateSinglePreview(
  userId: string,
  file: Express.Multer.File,
  useCompression: boolean = true
): Promise<boolean> {
  try {
    const extension = path.extname(file.originalname).toLowerCase();
    
    // Check if preview is supported
    if (!isPreviewSupported(extension)) {
      logger.debug(`Preview not supported for extension: ${extension}`);
      return false;
    }

    // Read the original file (which should already be encrypted)
    const originalFilePath = file.path;
    if (!fs.existsSync(originalFilePath)) {
      logger.error(`Original file not found: ${originalFilePath}`);
      return false;
    }

    // Read and decrypt the original file
    const encryptedBuffer = await fs.promises.readFile(originalFilePath);
    const decryptedBuffer = decryptFileBuffer(encryptedBuffer, userId);
    
    let previewBuffer: Buffer;
    
    if (IMAGE_EXTENSIONS.includes(extension)) {
      // For images, create a resized version
      previewBuffer = resizeImage(decryptedBuffer);
      logger.debug(`Generated image preview for ${file.filename}`);
    } else if (TEXT_EXTENSIONS.includes(extension)) {
      // For text files, create a text preview
      const textContent = decryptedBuffer.toString('utf-8');
      previewBuffer = generateTextPreview(textContent);
      logger.debug(`Generated text preview for ${file.filename}`);
    } else {
      logger.debug(`No specific preview handler for extension: ${extension}`);
      return false;
    }
    
    // Apply compression if requested
    if (useCompression) {
      try {
        previewBuffer = compressBuffer(previewBuffer);
        logger.debug(`Compressed preview for ${file.filename}`);
      } catch (compressionError) {
        logger.warn(`Failed to compress preview for ${file.filename}, using uncompressed:`, compressionError);
        // Continue with uncompressed version
      }
    }
    
    // Encrypt the preview
    const encryptedPreview = encryptFileBuffer(previewBuffer, userId);
    
    // Ensure preview directory exists
    const previewDir = getUserPreviewsDirectoryPath(userId);
    if (!fs.existsSync(previewDir)) {
      fs.mkdirSync(previewDir, { recursive: true });
    }
    
    // Save the encrypted preview with the same filename as the original file
    const previewFilePath = path.join(previewDir, file.filename);
    await fs.promises.writeFile(previewFilePath, encryptedPreview);
    
    logger.info(`Successfully generated preview for ${file.filename}`);
    return true;
    
  } catch (error) {
    logger.error(`Failed to generate preview for ${file.filename}:`, error);
    return false;
  }
}

/**
 * Middleware to generate previews for uploaded files
 * This should be called after file encryption but before saving to database
 */
export const generatePreviews = async (
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

    // Track which files have previews for database updates
    const previewResults: Record<string, boolean> = {};
    
    // Process each file for preview generation
    for (const file of files) {
      try {
        const hasPreview = await generateSinglePreview(userId, file, true);
        previewResults[file.filename] = hasPreview;
        
        if (hasPreview) {
          logger.info(`Preview generated for ${file.filename}`);
        } else {
          logger.debug(`No preview generated for ${file.filename}`);
        }
      } catch (error) {
        logger.error(`Error generating preview for ${file.filename}:`, error);
        previewResults[file.filename] = false;
      }
    }

    // Store preview results in request for file service to use
    req.previewResults = previewResults;
    
    next();
  } catch (error) {
    logger.error('Error in preview generation middleware:', error);
    // Don't fail the upload if preview generation fails
    next();
  }
};

/**
 * Get decrypted and decompressed preview buffer for a file
 */
export async function getPreviewBuffer(
  userId: string, 
  storageKey: string, 
  isCompressed: boolean = true
): Promise<Buffer | null> {
  try {
    const previewFilePath = getPreviewPathFromStorageKey(userId, storageKey);
    
    if (!fs.existsSync(previewFilePath)) {
      logger.debug(`Preview not found: ${previewFilePath}`);
      return null;
    }
    
    // Read and decrypt the preview
    const encryptedBuffer = await fs.promises.readFile(previewFilePath);
    let decryptedBuffer = decryptFileBuffer(encryptedBuffer, userId);
    
    // Decompress if needed
    if (isCompressed) {
      try {
        decryptedBuffer = decompressBuffer(decryptedBuffer);
        logger.debug(`Decompressed preview for ${storageKey}`);
      } catch (decompressionError) {
        logger.warn(`Failed to decompress preview for ${storageKey}, using as-is:`, decompressionError);
        // Continue with the decrypted but uncompressed version
      }
    }
    
    return decryptedBuffer;
    
  } catch (error) {
    logger.error(`Failed to get preview buffer for ${storageKey}:`, error);
    return null;
  }
}

/**
 * Check if a preview exists for a file
 */
export function previewExists(userId: string, storageKey: string): boolean {
  try {
    const previewFilePath = getPreviewPathFromStorageKey(userId, storageKey);
    return fs.existsSync(previewFilePath);
  } catch (error) {
    logger.error(`Error checking if preview exists for ${storageKey}:`, error);
    return false;
  }
}

/**
 * Delete a preview file
 */
export async function deletePreview(userId: string, storageKey: string): Promise<boolean> {
  try {
    const previewFilePath = getPreviewPathFromStorageKey(userId, storageKey);
    
    if (fs.existsSync(previewFilePath)) {
      await fs.promises.unlink(previewFilePath);
      logger.info(`Successfully deleted preview for ${storageKey}`);
      return true;
    }
    
    logger.debug(`Preview file not found for deletion: ${previewFilePath}`);
    return true; // Consider it successful if file doesn't exist
    
  } catch (error) {
    logger.error(`Failed to delete preview for ${storageKey}:`, error);
    return false;
  }
}