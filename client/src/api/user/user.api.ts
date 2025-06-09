import API from "@/lib/axios";
import {
  DeleteUserAccountInput,
  LoginUserInput,
  RefreshTokenInput,
  RegisterUserInput,
  UpdateUserInput,
  UpdateUserPasswordInput,
} from "@/validation/authForm";

/**
 * User API functions for public, authenticated, and admin use
 */
export const userApi = {
  // PUBLIC ENDPOINTS - No authentication required
  register: (data: RegisterUserInput) => API.post("/auth/register", data),

  login: (data: LoginUserInput) => API.post("/auth/login", data),

  refreshToken: (data: RefreshTokenInput) =>
    API.post("/auth/refresh-token", data),

  // AUTH ENDPOINTS - Requires valid auth token
  getCurrentUser: () => API.get("/users/me"),

  updateProfile: (data: UpdateUserInput) => API.put("/users/me", data),

  updatePassword: (data: UpdateUserPasswordInput) =>
    API.patch("/users/me/password", data),

  updateAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return API.patch("/users/me/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  logout: () => API.post("/users/logout"),

  deleteAccount: (data: DeleteUserAccountInput) =>
    API.delete("/users/me", { data }),

  // ADMIN ENDPOINTS - Requires admin privileges
  getAllUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    API.get("/admin/users", { params }),

  getUsersPaginated: (params?: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    searchFields?: string[];
    filters?: Record<string, any>;
  }) => API.get("/admin/users/paginated", { params: {
    ...params,
    searchFields: params?.searchFields?.join(','),
    filters: params?.filters ? JSON.stringify(params.filters) : undefined,
    // Extract date range parameters from filters
    createdAtStart: params?.filters?.createdAtStart,
    createdAtEnd: params?.filters?.createdAtEnd
  }}),

  getUserById: (id: string) => API.get(`/admin/users/${id}`),

  updateUser: (id: string, data: UpdateUserInput) =>
    API.put(`/admin/users/${id}`, data),

  updateUserPassword: (id: string, data: UpdateUserPasswordInput) =>
    API.patch(`/admin/users/${id}/password`, data),
};

export default userApi;
