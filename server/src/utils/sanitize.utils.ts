/**
 * Sanitizes a filename by removing invalid characters and ensuring it's safe for filesystem use
 * @param filename The filename to sanitize
 * @returns Sanitized filename
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove invalid characters
    .replace(/^\.+/, '')                    // Remove leading dots
    .replace(/\s+/g, ' ')                   // Replace multiple spaces with single space
    .trim();                                // Remove leading/trailing whitespace
};