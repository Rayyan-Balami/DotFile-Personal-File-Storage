import { MASTER_KEY } from '@config/constants.js';
import { encrypt, decrypt } from './simpleAes.utils.js';
import { compressBuffer, decompressBuffer } from './huffmanCompression.utils.js';
import logger from './logger.utils.js';

/**
 * Create a user-specific encryption key from userId + MASTER_KEY
 */
export function deriveUserKey(userId: string): string {
  try {
    const userIdBytes = Buffer.from(userId);
    const encrypted = encrypt(userIdBytes, MASTER_KEY);
    return encrypted.toString('hex').substring(0, 32); // trim to 32-char hex
  } catch (error) {
    logger.error('Failed to derive user key:', error);
    return `${MASTER_KEY}-${userId}`.substring(0, 32);
  }
}

/**
 * Flag to control whether to use compression
 * This can be made configurable in the future
 */
const USE_COMPRESSION = true;

/**
 * Encrypt file buffer using user-specific key
 * Applies Huffman compression before encryption if enabled
 */
export function encryptFileBuffer(file: Buffer, userId: string): Buffer {
  try {
    // First, apply Huffman compression if enabled
    let processedBuffer = file;
    if (USE_COMPRESSION) {
      // Only compress if file is large enough to benefit
      if (file.length > 100) {
        logger.debug(`Compressing file buffer: ${file.length} bytes`);
        processedBuffer = compressBuffer(file);
        logger.debug(`Compressed size: ${processedBuffer.length} bytes`);
      } else {
        logger.debug('File too small for compression, skipping');
      }
    }
    
    // Then encrypt with the user's key
    const userKey = deriveUserKey(userId);
    return encrypt(processedBuffer, userKey);
  } catch (error) {
    logger.error('Error in encryptFileBuffer:', error);
    // Fall back to just encrypting the original data if compression fails
    const userKey = deriveUserKey(userId);
    return encrypt(file, userKey);
  }
}

/**
 * Decrypt file buffer using user-specific key
 * Applies Huffman decompression after decryption if the file was compressed
 */
export function decryptFileBuffer(file: Buffer, userId: string): Buffer {
  try {
    // First decrypt the file
    const userKey = deriveUserKey(userId);
    const decryptedBuffer = decrypt(file, userKey);
    
    // Then attempt to decompress if compression is enabled
    if (USE_COMPRESSION) {
      try {
        // Check if this looks like a compressed buffer by checking for header
        // This is a simple heuristic and might be improved
        if (decryptedBuffer.length > 6) {
          const originalLength = decryptedBuffer.readUInt32BE(0);
          // Basic sanity check - if original length is reasonable, assume it's compressed
          if (originalLength > 0 && originalLength < 100 * 1024 * 1024) { // 100MB max
            logger.debug(`Decompressing buffer of size ${decryptedBuffer.length} bytes`);
            const decompressedBuffer = decompressBuffer(decryptedBuffer);
            return decompressedBuffer;
          }
        }
      } catch (decompressError) {
        // If decompression fails, assume the file wasn't compressed
        logger.debug('Decompression failed, assuming file was not compressed');
      }
    }
    
    // Return the decrypted buffer as-is if it wasn't compressed or decompression failed
    return decryptedBuffer;
  } catch (error) {
    logger.error('Error in decryptFileBuffer:', error);
    throw error;
  }
}
