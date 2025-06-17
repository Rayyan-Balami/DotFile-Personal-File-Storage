import { MASTER_KEY } from "@config/constants.js";
import {
  compressBuffer,
  decompressBuffer,
} from "@utils/huffmanCompression.utils.js";
import logger from "@utils/logger.utils.js";
import { decrypt, encrypt } from "@utils/AES.js";
import { Request } from "express";

/**
 * Derives a user-specific encryption key from userId and MASTER_KEY.
 * Uses AES encryption on userId bytes, then trims result to 32 hex chars.
 * Falls back to a simple concatenation on error.
 *
 * @param userId - Unique identifier of user
 * @param req - Optional Express request object for detailed logging
 * @returns 32-character hex string as user key
 */
export function deriveUserKey(userId: string, req?: Request): string {
  try {
    if (req?.addLog) {
      req.addLog("CryptoUtil", "DEBUG", `Deriving user key for user: ${userId}`);
      req.addLog("CryptoUtil", "DEBUG", `Using MASTER_KEY (first 4 chars): ${MASTER_KEY.substring(0, 4)}...`);
    }
    
    const userIdBytes = Buffer.from(userId);
    const encrypted = encrypt(userIdBytes, MASTER_KEY, req);
    const derivedKey = encrypted.toString("hex").substring(0, 32);
    
    if (req?.addLog) {
      req.addLog("CryptoUtil", "DEBUG", `Derived key (first 8 chars): ${derivedKey.substring(0, 8)}...`);
    }
    
    return derivedKey;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to derive user key:", errMsg);
    
    if (req?.addLog) {
      req.addLog("CryptoUtil", "ERROR", `Failed to derive user key: ${errMsg}`);
      req.addLog("CryptoUtil", "DEBUG", `Falling back to simple key derivation`);
    }
    
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
 * @param req - Optional Express request object for detailed logging
 * @returns Encrypted Buffer (compressed if applicable)
 */
export function encryptFileBuffer(file: Buffer, userId: string, req?: Request): Buffer {
  try {
    let processedBuffer = file;
    
    if (req?.addLog) {
      req.addLog("CryptoUtil", "INFO", `Starting file encryption for user: ${userId}`);
      req.addLog("CryptoUtil", "DEBUG", `Original file size: ${file.length} bytes`);
    }

    if (USE_COMPRESSION) {
      if (file.length > 100) {
        logger.debug(`Compressing file buffer: ${file.length} bytes`);
        
        if (req?.addLog) {
          req.addLog("CryptoUtil", "DEBUG", `File size > 100 bytes, applying Huffman compression`);
        }
        
        processedBuffer = compressBuffer(file, req);
        
        const compressionRatio = ((processedBuffer.length / file.length) * 100).toFixed(1);
        logger.debug(`Compressed size: ${processedBuffer.length} bytes`);
        
        if (req?.addLog) {
          req.addLog(
            "CryptoUtil", 
            "INFO", 
            `Compression result: ${file.length} → ${processedBuffer.length} bytes (${compressionRatio}%)`
          );
        }
      } else {
        logger.debug("File too small for compression, skipping");
        
        if (req?.addLog) {
          req.addLog("CryptoUtil", "DEBUG", `File too small for compression, skipping`);
        }
      }
    }

    if (req?.addLog) {
      req.addLog("CryptoUtil", "DEBUG", `Deriving encryption key for userId: ${userId}`);
    }
    
    const userKey = deriveUserKey(userId, req);
    
    if (req?.addLog) {
      req.addLog("CryptoUtil", "DEBUG", `Beginning AES encryption with derived key`);
      req.addLog("CryptoUtil", "DEBUG", `Buffer size pre-encryption: ${processedBuffer.length} bytes`);
    }
    
    const encryptedBuffer = encrypt(processedBuffer, userKey, req);
    
    if (req?.addLog) {
      req.addLog("CryptoUtil", "INFO", `File successfully encrypted`);
      req.addLog("CryptoUtil", "DEBUG", `Final encrypted size: ${encryptedBuffer.length} bytes`);
    }
    
    return encryptedBuffer;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error("Error in encryptFileBuffer:", errMsg);
    
    if (req?.addLog) {
      req.addLog("CryptoUtil", "ERROR", `Encryption failed: ${errMsg}`);
      req.addLog("CryptoUtil", "DEBUG", `Falling back to direct encryption without compression`);
    }

    // Fallback: encrypt original file without compression
    const userKey = deriveUserKey(userId, req);
    return encrypt(file, userKey, req);
  }
}

/**
 * Decrypts an encrypted file buffer using user-specific key.
 * If compression is enabled, tries to decompress the decrypted buffer.
 * Uses simple header check to guess if buffer is compressed.
 *
 * @param file - Encrypted file data as Buffer
 * @param userId - User ID to derive decryption key
 * @param req - Optional Express request object for detailed logging
 * @returns Decrypted (and decompressed if applicable) Buffer
 * @throws Throws error if decryption fails
 */
export function decryptFileBuffer(file: Buffer, userId: string, req?: Request): Buffer {
  try {
    if (req?.addLog) {
      req.addLog("CryptoUtil", "INFO", `Starting file decryption for user: ${userId}`);
      req.addLog("CryptoUtil", "DEBUG", `Encrypted file size: ${file.length} bytes`);
    }
    
    const userKey = deriveUserKey(userId, req);
    
    if (req?.addLog) {
      req.addLog("CryptoUtil", "DEBUG", `Beginning AES decryption with derived key`);
    }
    
    const decryptedBuffer = decrypt(file, userKey, req);
    
    if (req?.addLog) {
      req.addLog("CryptoUtil", "INFO", `File successfully decrypted`);
      req.addLog("CryptoUtil", "DEBUG", `Decrypted size before decompression: ${decryptedBuffer.length} bytes`);
    }

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
            
            if (req?.addLog) {
              req.addLog("CryptoUtil", "DEBUG", `Compressed header detected, decompressing buffer`);
              req.addLog("CryptoUtil", "DEBUG", `Expected original size: ${originalLength} bytes`);
            }
            
            const decompressed = decompressBuffer(decryptedBuffer, req);
            
            if (req?.addLog) {
              req.addLog("CryptoUtil", "INFO", 
                `Decompression complete: ${decryptedBuffer.length} → ${decompressed.length} bytes`);
            }
            
            return decompressed;
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.debug("Decompression failed, assuming file was not compressed");
        
        if (req?.addLog) {
          req.addLog("CryptoUtil", "WARN", `Decompression failed: ${errMsg}`);
          req.addLog("CryptoUtil", "DEBUG", `Assuming file was not compressed, returning decrypted buffer as is`);
        }
      }
    } else if (req?.addLog) {
      req.addLog("CryptoUtil", "DEBUG", `Compression disabled, skipping decompression step`);
    }

    return decryptedBuffer;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error("Error in decryptFileBuffer:", errMsg);
    
    if (req?.addLog) {
      req.addLog("CryptoUtil", "ERROR", `Decryption failed: ${errMsg}`);
    }
    
    throw error;
  }
}
