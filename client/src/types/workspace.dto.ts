import { WorkspaceIconType } from "@/config/icons";

export interface CreateWorkspaceDto {
  name: string;
  color?: string;
  icon?: WorkspaceIconType;
}

export interface UpdateWorkspaceDto {
  name?: string;
  color?: string;
  icon?: WorkspaceIconType;
}

export interface RenameWorkspaceDto {
  newName: string;
}

export interface WorkspaceResponseDto {
  id: string;
  name: string;
  owner: string;
  color: string;
  icon: WorkspaceIconType;
  createdAt: Date;
  updatedAt: Date;
}