import { WorkspaceIconType } from "@/config/icons";

export interface WorkspaceDto {
  id: string;
  name: string;
  description?: string;
  icon: WorkspaceIconType;
  owner: string;
  collaborators?: string[];
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceDto {
  name: string;
  description?: string;
  icon: WorkspaceIconType;
  userId: string;
  isPrivate?: boolean;
  collaborators?: string[];
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
  icon?: WorkspaceIconType;
  collaborators?: string[];
  isPrivate?: boolean;
}

export interface RenameWorkspaceDto {
  newName: string;
}
