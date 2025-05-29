import { User } from "@/types/user";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useQueryClient } from "@tanstack/react-query";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
  updateUser: (user: User) => void;
}

console.log('🏗️ Initializing Auth Store');

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => {
        console.log('🔐 Auth State Updated:', {
          previousUser: get().user,
          newUser: user,
          storageChange: get().user?.storageUsed !== user.storageUsed ? {
            previous: get().user?.storageUsed,
            new: user.storageUsed,
            difference: (user.storageUsed || 0) - (get().user?.storageUsed || 0)
          } : null
        });
        set({ user, accessToken, isAuthenticated: true });
      },
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () => {
        console.log('🔒 Auth State Cleared');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
      updateUser: (user) => {
        const currentUser = get().user;
        console.log('👤 User Data Update Triggered:', {
          previousStorage: currentUser?.storageUsed,
          newStorage: user.storageUsed,
          difference: (user.storageUsed || 0) - (currentUser?.storageUsed || 0),
          timestamp: new Date().toISOString()
        });
        set({ user });
        console.log('✅ User Data Update Completed');
      },
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => {
        console.log('♻️ Auth Store Rehydrated');
        return (state) => {
          console.log('🔄 Auth Store State Restored:', state);
        };
      },
    }
  )
);

// Custom hook to refresh user data
export const useRefreshUserData = () => {
  const queryClient = useQueryClient();
  
  return {
    refreshUser: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    }
  };
};
