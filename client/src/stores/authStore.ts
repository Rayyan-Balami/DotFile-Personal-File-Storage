import { User } from "@/types/user";
import { UserRole } from "@/validation/authForm";
import { useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setAuth: (user: Omit<User, "isAdmin">, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
  updateUser: (user: Omit<User, "isAdmin">) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isAdmin: false,
      setAuth: (user, accessToken) => {
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isAdmin: user.role === UserRole.ADMIN,
        });
      },
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isAdmin: false,
        });
      },
      updateUser: (user) => {
        const isAdmin = user.role === UserRole.ADMIN;
        set({ user, isAdmin });
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
