/**
 * Formats a file size from bytes to a human-readable string
 * @param bytes The size in bytes
 * @returns Formatted string like "2.5 MB"
 */
export function formatFileSize(bytes: number | string): string {
  // Convert to number if it's a string
  const size = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  
  if (isNaN(size)) return '0 B';
  
  if (size < 1024) return size + ' B';
  else if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
  else if (size < 1073741824) return (size / 1048576).toFixed(1) + ' MB';
  else return (size / 1073741824).toFixed(1) + ' GB';
}

/**
 * Format folder child count as items
 * @param count Number of items in folder
 * @returns Formatted string like "3 items" or "1 item"
 */
export function formatChildCount(count: number): string {
  if (count === 0) return 'Empty';
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

/**
 * Format the appropriate count based on item type
 * @param item The file system item with cardType and counts
 * @returns Formatted string representation of the count
 */
export function formatItemCount(item: { cardType: 'folder' | 'document', childCount?: number, byteCount?: number }): string {
  if (item.cardType === 'folder') {
    return formatChildCount(item.childCount || 0);
  } else {
    return formatFileSize(item.byteCount || 0);
  }
}

/**
 * Format a date to a consistent string format
 * @param date Date object or string to format
 * @returns Formatted date string like "May 28, 2024"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}