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
  setAuth: (user: Omit<User, 'isAdmin'>, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
  updateUser: (user: Omit<User, 'isAdmin'>) => void;
}

// Helper function to add isAdmin property
const addIsAdmin = (user: Omit<User, 'isAdmin'>): User => ({
  ...user,
  isAdmin: user.role === UserRole.ADMIN,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isAdmin: false,
      setAuth: (user, accessToken) => {
        const userWithIsAdmin = addIsAdmin(user);
        const isAdmin = user.role === UserRole.ADMIN;
        set({ user: userWithIsAdmin, accessToken, isAuthenticated: true, isAdmin });
      },
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () => {
        set({ user: null, accessToken: null, isAuthenticated: false, isAdmin: false });
      },
      updateUser: (user) => {
        const userWithIsAdmin = addIsAdmin(user);
        const isAdmin = user.role === UserRole.ADMIN;
        set({ user: userWithIsAdmin, isAdmin });
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
