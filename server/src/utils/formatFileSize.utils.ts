/**
 * Format bytes into human readable string
 * @param bytes - Number of bytes to format
 * @returns Formatted string (e.g. "1.5 MB")
 */
export const formatFileSize = (bytes: number | string): string => {
  // Convert to number if it's a string
  const size = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  
  if (isNaN(size) || size === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(size) / Math.log(k));
  return `${parseFloat((size / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
