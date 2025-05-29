import { useGetCurrentUser } from "@/api/user/user.query";

/**
 * Hook to keep user data in sync with the server
 * This hook should be used in the root of authenticated routes
 * to ensure user data (like storage usage) stays up to date
 */
export function useUserSync() {
  // Subscribe to user data updates
  useGetCurrentUser();
} 