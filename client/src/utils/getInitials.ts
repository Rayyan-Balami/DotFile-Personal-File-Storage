/**
 * Get initials from a name (e.g., "John Doe" -> "JD")
 * @param name The full name string
 * @returns The initials (first letters of first and last name)
 */
export const getInitials = (name: string): string => {
  if (!name) return "";

  return name
    .split(" ")
    .filter((word) => word.length > 0)
    .slice(0, 2) // Take only first 2 words
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};
