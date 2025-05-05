export interface Plan {
  id: string;
  name: string;
  storageLimit: number;
  price: number;
  isDefault: boolean;
  deletedAt: null | string;
  createdAt: string;
  updatedAt: string;
}