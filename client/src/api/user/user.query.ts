import userApi from "@/api/user/user.api";
import { useAuthStore } from "@/stores/authStore";
import {
  AdminSetPasswordInput,
  DeleteUserAccountInput,
  LoginUserInput,
  RefreshTokenInput,
  RegisterUserInput,
  UpdateStorageLimitInput,
  UpdateUserInput,
  UpdateUserPasswordInput,
  UpdateUserRoleInput,
} from "@/validation/authForm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

// ==========================
// GUEST USER HOOKS
// ==========================

export const useRegister = () =>
  useMutation({
    mutationFn: (data: RegisterUserInput) =>
      userApi.register(data).then((res) => res.data),
  });

export const useLogin = () =>
  useMutation({
    mutationFn: (data: LoginUserInput) =>
      userApi.login(data).then((res) => res.data),
  });

export const useRefreshToken = () =>
  useMutation({
    mutationFn: (data: RefreshTokenInput) =>
      userApi.refreshToken(data).then((res) => res.data),
  });

// ==========================
// AUTH USER HOOKS
// ==========================

export const useGetCurrentUser = () => {
  const updateUser = useAuthStore((state) => state.updateUser);

  const query = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => userApi.getCurrentUser().then((res) => res.data),
  });

  useEffect(() => {
    if (query.data?.data?.user) {
      updateUser(query.data.data.user);
    }
  }, [query.data, updateUser]);

  return query;
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserInput) => userApi.updateProfile(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["currentUser"] }),
  });
};

export const useUpdatePassword = () =>
  useMutation({
    mutationFn: (data: UpdateUserPasswordInput) => userApi.updatePassword(data),
  });

export const useUpdateAvatar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => userApi.updateAvatar(file),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["currentUser"] }),
  });
};

export const useLogout = () =>
  useMutation({
    mutationFn: () => userApi.logout(),
  });

export const useDeleteAccount = () => {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeleteUserAccountInput) => userApi.deleteAccount(data),
    onSuccess: () => {
      // Clear auth state and all cached data
      clearAuth();
      queryClient.clear();
    },
  });
};

// ==========================
// ADMIN USER HOOKS
// ==========================

export const useGetAllUsers = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) =>
  useQuery({
    queryKey: ["adminUsers", params],
    queryFn: () => userApi.getAllUsers(params).then((res) => res.data),
  });

export const useGetUsersPaginated = (params?: {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  searchFields?: string[];
  filters?: Record<string, any>;
}) =>
  useQuery({
    queryKey: ["adminUsersPaginated", params],
    queryFn: () => userApi.getUsersPaginated(params).then((res) => res.data),
  });

export const useGetUserById = (id: string) =>
  useQuery({
    queryKey: ["adminUser", id],
    queryFn: () => userApi.getUserById(id).then((res) => res.data),
    enabled: !!id,
  });

export const useUpdateUser = () =>
  useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      userApi.updateUser(id, data),
  });

export const useUpdateUserPassword = () =>
  useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPasswordInput }) =>
      userApi.updateUserPassword(id, data),
  });

export const useSetUserPassword = () =>
  useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminSetPasswordInput }) =>
      userApi.adminSetUserPassword(id, data),
  });

export const useUpdateUserRole = () =>
  useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRoleInput }) =>
      userApi.updateUserRole(id, data),
  });

export const useUpdateStorageLimit = () =>
  useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStorageLimitInput }) =>
      userApi.updateUserStorageLimit(id, data),
  });

// ==========================
// ADMIN BULK OPERATION HOOKS
// ==========================

export const useBulkSoftDeleteUsers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) =>
      userApi.bulkSoftDeleteUsers(userIds).then((res) => res.data),
    onSuccess: () => {
      // Invalidate all user-related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminUsersPaginated"] });
    },
  });
};

export const useBulkRestoreUsers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) =>
      userApi.bulkRestoreUsers(userIds).then((res) => res.data),
    onSuccess: () => {
      // Invalidate all user-related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminUsersPaginated"] });
    },
  });
};

export const useBulkPermanentDeleteUsers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) =>
      userApi.bulkPermanentDeleteUsers(userIds).then((res) => res.data),
    onSuccess: () => {
      // Invalidate all user-related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminUsersPaginated"] });
    },
  });
};
