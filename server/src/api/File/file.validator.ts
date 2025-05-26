import { z } from "zod";

/**
 * Base schema for validating file names
 * Enforces length constraints and character restrictions for security
 * @regex Prevents directory traversal and ensures valid filesystem characters
 */
const fileNameSchema = z
  .string()
  .min(1, { message: "File name is required" })
  .max(255, { message: "File name must be at most 255 characters" })
  .regex(
    /^(?!\.{1,2}$)(?!\s*$)(?!.*\/)[a-zA-Z0-9 _\-.]+$/,
    "File name contains invalid characters"
  );

/**
 * Schema for file rename operations
 * @validates Non-empty file name with additional trimming check
 */
export const renameFileSchema = z.object({
  name: fileNameSchema.refine(
    (name) => name.trim().length > 0,
    { message: "File name cannot be empty" }
  ),
});

/**
 * Schema for file move operations
 * @validates Target folder ID (null allowed for root folder)
 */
export const moveFileSchema = z.object({
  destinationFolderId: z.string().nullable(),
});

/**
 * Schema for general file updates
 * @validates Optional file properties including name, folder reference, and pin status
 */
export const updateFileSchema = z.object({
  name: fileNameSchema.optional(),
  folder: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
});
