import { z } from "zod";

// Validation schema for creating a plan
const createPlanSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(50, { message: "Name must be at most 50 characters" }),

  storageLimit: z
    .number()
    .min(0, { message: "Storage limit cannot be negative" })
    .refine((value) => Number.isInteger(value), {
      message: "Storage limit must be an integer",
    }),

  price: z
    .number()
    .min(0, { message: "Price cannot be negative" })
    .refine((value) => Number(value.toFixed(2)) === value, {
      message: "Price can have at most 2 decimal places",
    }),

  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters" })
    .max(500, { message: "Description must be at most 500 characters" }),

  features: z
    .array(z.string().min(1, { message: "Feature cannot be empty" }))
    .min(1, { message: "At least one feature is required" })
    .max(10, { message: "Maximum of 10 features allowed" }),

  isDefault: z.boolean().optional(),
});

// Validation schema for updating a plan
const updatePlanSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(50, { message: "Name must be at most 50 characters" })
    .optional(),

  storageLimit: z
    .number()
    .min(0, { message: "Storage limit cannot be negative" })
    .refine((value) => Number.isInteger(value), {
      message: "Storage limit must be an integer",
    })
    .optional(),

  price: z
    .number()
    .min(0, { message: "Price cannot be negative" })
    .refine((value) => Number(value.toFixed(2)) === value, {
      message: "Price can have at most 2 decimal places",
    })
    .optional(),

  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters" })
    .max(500, { message: "Description must be at most 500 characters" })
    .optional(),

  features: z
    .array(z.string().min(1, { message: "Feature cannot be empty" }))
    .min(1, { message: "At least one feature is required" })
    .max(10, { message: "Maximum of 10 features allowed" })
    .optional(),

  isDefault: z.boolean().optional(),
});

export { createPlanSchema, updatePlanSchema };
