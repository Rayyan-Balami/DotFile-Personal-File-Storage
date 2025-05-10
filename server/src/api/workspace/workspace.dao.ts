import { CreateWorkspaceDto } from "@api/workspace/workspace.dto.js";
import Workspace, { IWorkspace } from "@api/workspace/workspace.model.js";

class WorkspaceDao {
  // Define the methods and properties of the workspace DAO here
  // For example:
  async createWorkspace(workspaceData: CreateWorkspaceDto): Promise<IWorkspace> {
    const newWorkspace = new Workspace(workspaceData);
    return newWorkspace.save();
  }

  async getWorkspaceById(workspaceId: string): Promise<IWorkspace | null> {
    return Workspace.findById(workspaceId).populate("owner");
  }

  async updateWorkspace(workspaceId: string, updateData: Partial<CreateWorkspaceDto>): Promise<IWorkspace | null> {
    return Workspace.findByIdAndUpdate(workspaceId, { $set: updateData }, { new: true }).populate("owner");
  }

  async deleteWorkspace(workspaceId: string): Promise<IWorkspace | null> {
    return Workspace.findByIdAndDelete(workspaceId);
  }

  async getWorkspacesByUserId(userId: string): Promise<IWorkspace[]> {
    return Workspace.find({ owner: userId }).populate("owner");
  }

  async renameWorkspace(workspaceId: string, newName: string): Promise<IWorkspace | null> {
    return Workspace.findByIdAndUpdate(workspaceId, { name: newName }, { new: true }).populate("owner");
  }

  async getWorkspaceByName(workspaceName: string): Promise<IWorkspace | null> {
    return Workspace.findOne({ name: workspaceName }).populate("owner");
  }

}


export default new WorkspaceDao();