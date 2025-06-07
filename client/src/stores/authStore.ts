import { User } from "@/types/user";
import { useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => {
        set({ user, accessToken, isAuthenticated: true });
      },
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
      updateUser: (user) => {
        set({ user });
      },
    }),
    {
      name: "auth-storage",
    }
  )
);

export const useRefreshUserData = () => {
  const queryClient = useQueryClient();
  return {
    refreshUser: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  };
};
