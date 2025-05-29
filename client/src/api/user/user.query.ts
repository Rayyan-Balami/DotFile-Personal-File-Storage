import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import userApi from "./user.api";
import {
  LoginUserInput,
  RegisterUserInput,
  RefreshTokenInput,
  UpdateUserInput,
  UpdateUserPasswordInput,
} from "@/validation/authForm";
import { useAuthStore } from "@/stores/authStore";
import { User } from "@/types/user";

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

interface CurrentUserResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    user: User;
  };
  timestamp: string;
}

export const useGetCurrentUser = () => {
  const updateUser = useAuthStore((state) => state.updateUser);
  
  return useQuery<CurrentUserResponse>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      console.log('📡 Fetching current user data');
      const response = await userApi.getCurrentUser();
      console.log('📥 Received user data:', response.data);
      return response.data;
    },
    select: (data) => {
      console.log('🔄 Processing user data in select:', data);
      // Update the auth store with the new user data
      if (data?.data?.user) {
        console.log('👤 Updating auth store with user:', data.data.user);
        updateUser(data.data.user);
      } else {
        console.log('⚠️ No user data found in response');
      }
      return data;
    },
  });
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

export const useLogout = () =>
  useMutation({
    mutationFn: () => userApi.logout(),
  });

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

export const useGetUserById = (id: string) =>
  useQuery({
    queryKey: ["adminUser", id],
    queryFn: () => userApi.getUserById(id).then((res) => res.data),
    enabled: !!id, // only run if id is truthy
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

export const useDeleteUser = () =>
  useMutation({
    mutationFn: (id: string) => userApi.deleteUser(id),
  });
