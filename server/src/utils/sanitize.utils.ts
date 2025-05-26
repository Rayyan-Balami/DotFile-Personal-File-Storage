/**
 * Sanitize a filename to make it safe for filesystem use.
 * Removes invalid characters and trims whitespace.
 *
 * @param filename Original filename string
 * @returns Sanitized, safe filename string
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    // Remove characters invalid in filenames on most OS:
    // < > : " / \ | ? * and control chars (0x00-0x1F)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') 

    // Remove leading dots to avoid hidden/system files on Unix
    .replace(/^\.+/, '')                   

    // Replace multiple spaces inside filename with single space
    .replace(/\s+/g, ' ')                   

    // Trim spaces at the start and end of filename
    .trim();
};
