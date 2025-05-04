export interface CreatePlanDTO {
  name: string;
  storageLimit: number; // in bytes
  price: number;
  description: string;
  features: string[];
  isDefault?: boolean;
}

export interface UpdatePlanDTO {
  name?: string;
  storageLimit?: number;
  price?: number;
  description?: string;
  features?: string[];
  isDefault?: boolean;
}

export interface PlanResponseDTO {
  id: string;
  name: string;
  storageLimit: number;
  price: number;
  description: string;
  features: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Extend the PlanResponseDTO with user subscription info
export interface UserPlanResponseDTO extends PlanResponseDTO {
  storageUsed: number;
  storagePercentUsed: number;
}