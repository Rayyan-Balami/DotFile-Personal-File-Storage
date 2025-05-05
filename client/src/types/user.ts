import { Plan } from "@/types/plan";

export interface User {
  id: string;
  avatar: string;
  name: string;
  email: string;
  role: string;
  plan: Plan;
  storageUsed: number;
  deletedAt: null | string;
  createdAt: string;
  updatedAt: string;
}