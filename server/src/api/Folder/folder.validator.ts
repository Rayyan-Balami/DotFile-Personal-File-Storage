import { z } from "zod";

// Reusable folder name schema
const folderNameSchema = z
  .string()
  .min(1, { message: "Folder name is required" })
  .max(255, { message: "Folder name must be at most 255 characters" })
  .regex(
    /^(?!\.{1,2}$)(?!\s*$)(?!.*\/)[a-zA-Z0-9 _\-.]+$/,
    "Folder name contains invalid characters"
  );

const folderParentSchema = z.string().nullable().optional();

// Validation schema for creating a folder
export const createFolderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  parent: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
});

// Validation schema for updating a folder
export const updateFolderSchema = z.object({
  name: z.string().optional(),
  parent: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
  isPinned: z.boolean().optional(),
});

// Validation schema for renaming a folder
export const renameFolderSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

// Validation schema for moving a folder
export const moveFolderSchema = z.object({
  parent: z.string().nullable(),
});
