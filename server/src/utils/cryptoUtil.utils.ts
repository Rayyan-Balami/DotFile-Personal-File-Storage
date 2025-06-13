import { MASTER_KEY } from "@config/constants.js";
import {
  compressBuffer,
  decompressBuffer,
} from "@utils/huffmanCompression.utils.js";
import logger from "@utils/logger.utils.js";
import { decrypt, encrypt } from "@utils/AES.js";

/**
 * Derives a user-specific encryption key from userId and MASTER_KEY.
 * Uses AES encryption on userId bytes, then trims result to 32 hex chars.
 * Falls back to a simple concatenation on error.
 *
 * @param userId - Unique identifier of user
 * @returns 32-character hex string as user key
 */
export function deriveUserKey(userId: string): string {
  try {
    const userIdBytes = Buffer.from(userId);
    const encrypted = encrypt(userIdBytes, MASTER_KEY);
    return encrypted.toString("hex").substring(0, 32);
  } catch (error) {
    logger.error("Failed to derive user key:", error);
    return `${MASTER_KEY}-${userId}`.substring(0, 32);
  }
}

/** Flag to enable or disable compression in file encryption/decryption */
const USE_COMPRESSION = true;

/**
 * Encrypts a file buffer using the user-specific key.
 * Compresses the file first using Huffman coding if compression enabled and file size > 100 bytes.
 *
 * @param file - Raw file data as Buffer
 * @param userId - User ID to derive encryption key
 * @returns Encrypted Buffer (compressed if applicable)
 */
export function encryptFileBuffer(file: Buffer, userId: string): Buffer {
  try {
    let processedBuffer = file;

    if (USE_COMPRESSION) {
      if (file.length > 100) {
        logger.debug(`Compressing file buffer: ${file.length} bytes`);
        processedBuffer = compressBuffer(file);
        logger.debug(`Compressed size: ${processedBuffer.length} bytes`);
      } else {
        logger.debug("File too small for compression, skipping");
      }
    }

    const userKey = deriveUserKey(userId);
    return encrypt(processedBuffer, userKey);
  } catch (error) {
    logger.error("Error in encryptFileBuffer:", error);

    // Fallback: encrypt original file without compression
    const userKey = deriveUserKey(userId);
    return encrypt(file, userKey);
  }
}

/**
 * Decrypts an encrypted file buffer using user-specific key.
 * If compression is enabled, tries to decompress the decrypted buffer.
 * Uses simple header check to guess if buffer is compressed.
 *
 * @param file - Encrypted file data as Buffer
 * @param userId - User ID to derive decryption key
 * @returns Decrypted (and decompressed if applicable) Buffer
 * @throws Throws error if decryption fails
 */
export function decryptFileBuffer(file: Buffer, userId: string): Buffer {
  try {
    const userKey = deriveUserKey(userId);
    const decryptedBuffer = decrypt(file, userKey);

    if (USE_COMPRESSION) {
      try {
        // Simple heuristic: check if buffer likely contains compressed data
        if (decryptedBuffer.length > 6) {
          const originalLength = decryptedBuffer.readUInt32BE(0);

          // Validate length (must be positive and reasonably small)
          if (originalLength > 0 && originalLength < 100 * 1024 * 1024) {
            logger.debug(
              `Decompressing buffer of size ${decryptedBuffer.length} bytes`
            );
            return decompressBuffer(decryptedBuffer);
          }
        }
      } catch {
        logger.debug("Decompression failed, assuming file was not compressed");
      }
    }

    return decryptedBuffer;
  } catch (error) {
    logger.error("Error in decryptFileBuffer:", error);
    throw error;
  }
}
