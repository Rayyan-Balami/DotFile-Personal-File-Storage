import fs from 'fs';
import path from 'path';
import logger from '@utils/logger.utils.js';
import { getUserPreviewsDirectoryPath, getFilePathFromStorageKey, getPreviewPathFromStorageKey } from '@utils/mkdir.utils.js';
import { decryptFileBuffer, encryptFileBuffer } from '@utils/cryptoUtil.utils.js';

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
 * Check if a file type supports preview generation
 * @param extension File extension (with dot)
 * @returns Boolean indicating if preview is supported
 */
export function isPreviewSupported(extension: string): boolean {
  return PREVIEW_SUPPORTED_TYPES.includes(extension.toLowerCase());
}

/**
 * Simple image resizing function (creates a smaller version)
 * This is a basic implementation - in production, use a proper image library
 * @param inputBuffer Original image buffer
 * @param maxWidth Maximum width for preview
 * @param maxHeight Maximum height for preview
 * @returns Resized image buffer
 */
function resizeImage(inputBuffer: Buffer, maxWidth: number = 300, maxHeight: number = 300): Buffer {
  // This is a placeholder implementation
  // In a real application, you would use libraries like:
  // - sharp (recommended for Node.js)
  // - jimp (pure JavaScript)
  // - imagemagick bindings
  
  // For now, we'll just return the original buffer with a size limit
  // If the original is already small enough, return as-is
  if (inputBuffer.length <= 50 * 1024) { // 50KB or less
    return inputBuffer;
  }
  
  // For larger files, we'll create a simple thumbnail
  // This is a very basic approach - replace with proper image processing
  logger.debug(`Image resizing not implemented, returning original for preview`);
  return inputBuffer;
}

/**
 * Generate a text preview image from text content
 * Creates a simple image with text content for preview
 * @param textContent The text content to convert
 * @param maxLines Maximum number of lines to include
 * @returns Buffer containing a simple text preview image
 */
function generateTextPreview(textContent: string, maxLines: number = 10): Buffer {
  // This is a simplified implementation
  // In production, you might want to use:
  // - canvas library to generate actual images
  // - HTML to image conversion
  // - or just return the first few lines as text
  
  const lines = textContent.split('\n').slice(0, maxLines);
  const previewText = lines.join('\n');
  
  // For now, we'll just create a simple text representation
  // In a real implementation, this would generate an actual image
  logger.debug(`Text preview generation not fully implemented`);
  
  // Return a simple text buffer (you could enhance this to create actual images)
  return Buffer.from(previewText, 'utf-8');
}

/**
 * Generate a preview for a file
 * @param userId User ID who owns the file
 * @param storageKey Storage key of the original file
 * @param originalExtension Original file extension
 * @returns Boolean indicating if preview was generated successfully
 */
export async function generatePreview(
  userId: string, 
  storageKey: string, 
  originalExtension: string
): Promise<boolean> {
  try {
    const extension = originalExtension.toLowerCase();
    
    // Check if preview is supported
    if (!isPreviewSupported(extension)) {
      logger.debug(`Preview not supported for extension: ${extension}`);
      return false;
    }
    
    // Get file paths
    const originalFilePath = getFilePathFromStorageKey(userId, storageKey);
    const previewFilePath = getPreviewPathFromStorageKey(userId, storageKey);
    
    // Check if original file exists
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
      logger.debug(`Generated image preview for ${storageKey}`);
    } else if (TEXT_EXTENSIONS.includes(extension)) {
      // For text files, create a text preview
      const textContent = decryptedBuffer.toString('utf-8');
      previewBuffer = generateTextPreview(textContent);
      logger.debug(`Generated text preview for ${storageKey}`);
    } else {
      logger.debug(`No specific preview handler for extension: ${extension}`);
      return false;
    }
    
    // Encrypt the preview
    const encryptedPreview = encryptFileBuffer(previewBuffer, userId);
    
    // Ensure preview directory exists
    const previewDir = getUserPreviewsDirectoryPath(userId);
    if (!fs.existsSync(previewDir)) {
      fs.mkdirSync(previewDir, { recursive: true });
    }
    
    // Save the encrypted preview
    await fs.promises.writeFile(previewFilePath, encryptedPreview);
    
    logger.info(`Successfully generated preview for ${storageKey}`);
    return true;
    
  } catch (error) {
    logger.error(`Failed to generate preview for ${storageKey}:`, error);
    return false;
  }
}

/**
 * Delete a preview file
 * @param userId User ID who owns the file
 * @param storageKey Storage key of the file
 * @returns Boolean indicating if deletion was successful
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

/**
 * Check if a preview exists for a file
 * @param userId User ID who owns the file
 * @param storageKey Storage key of the file
 * @returns Boolean indicating if preview exists
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
 * Get decrypted preview buffer for a file
 * @param userId User ID who owns the file
 * @param storageKey Storage key of the file
 * @returns Decrypted preview buffer or null if not found
 */
export async function getPreviewBuffer(userId: string, storageKey: string): Promise<Buffer | null> {
  try {
    const previewFilePath = getPreviewPathFromStorageKey(userId, storageKey);
    
    if (!fs.existsSync(previewFilePath)) {
      logger.debug(`Preview not found: ${previewFilePath}`);
      return null;
    }
    
    // Read and decrypt the preview
    const encryptedBuffer = await fs.promises.readFile(previewFilePath);
    const decryptedBuffer = decryptFileBuffer(encryptedBuffer, userId);
    
    return decryptedBuffer;
    
  } catch (error) {
    logger.error(`Failed to get preview buffer for ${storageKey}:`, error);
    return null;
  }
}