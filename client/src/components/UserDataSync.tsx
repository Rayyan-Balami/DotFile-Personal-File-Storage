import { useGetCurrentUser } from "@/api/user/user.query";

export function UserDataSync() {
  // This component's only job is to keep user data in sync
  useGetCurrentUser();
  
  // This component doesn't render anything
  return null;
} 