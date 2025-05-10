export interface CreateWorkspaceDto {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateWorkspaceDto {
  name?: string;
  color?: string;
  icon?: string;
}

export interface RenameWorkspaceDto {
  newName: string;
}

export interface WorkspaceResponseDto {
  id: string;
  name: string;
  owner: string;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}