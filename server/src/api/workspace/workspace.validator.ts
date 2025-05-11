// filepath: /Users/rayyanbalami/Documents/proj/server/src/api/workspace/workspace.validator.ts
import { z } from "zod";

// Schema for creating a new workspace
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100, "Workspace name cannot exceed 100 characters"),
  color: z.string().optional(),
  icon: z.string().optional(),
});

// Schema for updating a workspace
export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100, "Workspace name cannot exceed 100 characters").optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

// Schema specifically for renaming a workspace
export const renameWorkspaceSchema = z.object({
  newName: z.string().min(1, "New workspace name is required").max(100, "Workspace name cannot exceed 100 characters"),
});

// Validation schema for adding a folder to a workspace
export const addFolderToWorkspaceSchema = z.object({
  folderId: z.string().trim().min(1, "Folder ID is required"),
});