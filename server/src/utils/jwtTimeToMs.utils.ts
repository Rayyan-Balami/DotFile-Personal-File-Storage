/**
 * Convert JWT time string to milliseconds for cookie maxAge
 * @param timeString JWT time string like '7d', '24h', etc.
 * @returns Time in milliseconds
 */
export const jwtTimeToMs = (timeString: string): number => {
  const unit = timeString.charAt(timeString.length - 1);
  const value = parseInt(timeString.slice(0, -1));
  
  switch (unit) {
    case 'd': // days
      return value * 24 * 60 * 60 * 1000;
    case 'h': // hours
      return value * 60 * 60 * 1000;
    case 'm': // minutes
      return value * 60 * 1000;
    case 's': // seconds
      return value * 1000;
    default:
      // Default to 7 days if format is unrecognized
      return 7 * 24 * 60 * 60 * 1000;
  }
};