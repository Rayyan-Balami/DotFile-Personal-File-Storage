import { z } from "zod";

// Reusable file name schema
const fileNameSchema = z
  .string()
  .min(1, { message: "File name is required" })
  .max(255, { message: "File name must be at most 255 characters" })
  .regex(
    /^(?!\.{1,2}$)(?!\s*$)(?!.*\/)[a-zA-Z0-9 _\-.]+$/,
    "File name contains invalid characters"
  );

// Validation schema for renaming a file
export const renameFileSchema = z.object({
  name: fileNameSchema.refine(
    (name) => name.trim().length > 0,
    { message: "File name cannot be empty" }
  ),
});

// Validation schema for moving a file
export const moveFileSchema = z.object({
  destinationFolderId: z.string().nullable(),
});

// Validation schema for updating a file
export const updateFileSchema = z.object({
  name: fileNameSchema.optional(),
  folder: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  isShared: z.boolean().optional(),
});
