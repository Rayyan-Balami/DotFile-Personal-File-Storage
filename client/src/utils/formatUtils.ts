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
 * Format a date as "Yesterday at 3:19 PM" or "May 24, 2025 at 6:09 PM"
 * @param date Date string or object
 * @param withTime Whether to include the time part
 * @returns Formatted human-friendly date
 */
export function formatDate(date: string | Date | null | undefined, withTime = false): string {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();

  const isToday = d.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeString = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  if (isToday) {
    return withTime ? `Today at ${timeString}` : 'Today';
  } else if (isYesterday) {
    return withTime ? `Yesterday at ${timeString}` : 'Yesterday';
  } else {
    const dateString = d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return withTime ? `${dateString} at ${timeString}` : dateString;
  }
}
