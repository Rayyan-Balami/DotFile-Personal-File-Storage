export interface PlanDto {
  id: string;
  name: string;
  storageLimit: number;
  price: number;
  description?: string;
  features?: string[];
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserPlanDto extends PlanDto {
  storageUsed: number;
  storagePercentUsed: number;
}

export interface CreatePlanDto {
  name: string;
  storageLimit: number;
  price: number;
  description?: string;
  features?: string[];
  isDefault?: boolean;
}

export interface UpdatePlanDto {
  name?: string;
  storageLimit?: number;
  price?: number;
  description?: string;
  features?: string[];
  isDefault?: boolean;
}
