import { z } from "zod";

// Reusable folder name schema
const folderNameSchema = z
  .string()
  .min(1, { message: "Folder name is required" })
  .max(255, { message: "Folder name must be at most 255 characters" })
  .regex(
    /^(?!\.{1,2}$)(?!\s*$)(?!.*\/)[a-zA-Z0-9 _\-.]+$/,
    "Folder name can contain letters, numbers, spaces, underscores (_), dashes (-), dots (.) but cannot contain forward slashes (/) or be just dots or whitespace"
  );

const folderParentSchema = z.string().nullable().optional();

// Validation schema for creating a folder
export const createFolderSchema = z.object({
  name: folderNameSchema,
  parent: folderParentSchema,
});

// Validation schema for updating a folder
export const updateFolderSchema = z.object({
  name: folderNameSchema.optional(),
  parent: folderParentSchema,
  workspace: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  isShared: z.boolean().optional(),
});
