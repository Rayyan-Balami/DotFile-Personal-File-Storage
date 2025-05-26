import { z } from "zod";

/**
 * Valid folder name pattern: 1-255 chars, alphanumeric with common symbols
 */
const folderNameSchema = z
  .string()
  .min(1, { message: "Folder name is required" })
  .max(255, { message: "Folder name must be at most 255 characters" })
  .regex(
    /^(?!\.{1,2}$)(?!\s*$)(?!.*\/)[a-zA-Z0-9 _\-.]+$/,
    "Folder name contains invalid characters"
  );

/**
 * Optional parent folder reference
 */
const folderParentSchema = z.string().nullable().optional();

/**
 * New folder creation rules
 */
export const createFolderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  parent: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
});

/**
 * Optional folder property updates
 */
export const updateFolderSchema = z.object({
  name: z.string().optional(),
  parent: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
  isPinned: z.boolean().optional(),
});

/**
 * Folder name change validation
 */
export const renameFolderSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

/**
 * Folder location change validation
 */
export const moveFolderSchema = z.object({
  parent: z.string().nullable(),
});
