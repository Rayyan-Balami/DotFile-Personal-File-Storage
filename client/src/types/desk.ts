import { WorkspaceIconType } from "@/config/icons";

export interface Workspace {
  id: string;
  name: string;
  color: string;
  icon: WorkspaceIconType;
}