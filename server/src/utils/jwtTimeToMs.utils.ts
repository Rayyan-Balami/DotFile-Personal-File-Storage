/**
 * Convert a JWT expiry time string (e.g., '7d', '24h') to milliseconds.
 * Useful for setting cookie maxAge or token expiration timers.
 *
 * @param {string} timeString - JWT time string ending with unit character:
 *   - 'd' for days
 *   - 'h' for hours
 *   - 'm' for minutes
 *   - 's' for seconds
 * @returns {number} Equivalent time in milliseconds.
 *   If the format is unrecognized, defaults to 7 days in milliseconds.
 */
export const jwtTimeToMs = (timeString: string): number => {
  const unit = timeString.charAt(timeString.length - 1); // Extract last char as unit
  const value = parseInt(timeString.slice(0, -1)); // Extract numeric value

  switch (unit) {
    case "d": // Convert days to milliseconds
      return value * 24 * 60 * 60 * 1000;
    case "h": // Convert hours to milliseconds
      return value * 60 * 60 * 1000;
    case "m": // Convert minutes to milliseconds
      return value * 60 * 1000;
    case "s": // Convert seconds to milliseconds
      return value * 1000;
    default:
      // Fallback: default to 7 days in milliseconds if unknown format
      return 7 * 24 * 60 * 60 * 1000;
  }
};
