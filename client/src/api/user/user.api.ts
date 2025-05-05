import API from "@/lib/axios";
import {
  RegisterUserInput,
  LoginUserInput,
  UpdateUserInput,
  UpdateUserPasswordInput,
  RefreshTokenInput,
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

  logout: () => API.post("/users/logout"),

  // ADMIN ENDPOINTS - Requires admin privileges
  getAllUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    API.get("/admin/users", { params }),

  getUserById: (id: string) => API.get(`/admin/users/${id}`),

  updateUser: (id: string, data: UpdateUserInput) =>
    API.put(`/admin/users/${id}`, data),

  updateUserPassword: (id: string, data: UpdateUserPasswordInput) =>
    API.patch(`/admin/users/${id}/password`, data),

  deleteUser: (id: string) => API.delete(`/admin/users/${id}`),
};

export default userApi;
