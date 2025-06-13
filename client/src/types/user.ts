import { UserRole } from "@/validation/authForm";

export interface User {
  id: string;
  avatar: string;
  name: string;
  email: string;
  role: UserRole;
  storageUsed: number;
  maxStorageLimit: number;
  deletedAt: null | string;
  createdAt: string;
  updatedAt: string;
}
