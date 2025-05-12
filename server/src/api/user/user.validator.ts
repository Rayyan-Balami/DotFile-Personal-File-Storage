import { z } from "zod";
import { UserRole } from "./user.dto.js";

// Extract common validations
const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters long" })
  .max(24, { message: "Password must be at most 24 characters long" })
  .regex(/[A-Z]/, {
    message: "Password must contain at least one uppercase letter",
  })
  .regex(/[0-9]/, { message: "Password must contain at least one number" })
  .regex(/[^a-zA-Z0-9]/, {
    message: "Password must contain at least one special character",
  });

const nameSchema = z
  .string()
  .min(3, { message: "Name must be at least 3 characters long" })
  .max(50, { message: "Name must be at most 50 characters long" })
  .regex(/^[a-zA-Z ]+$/, {
    message: "Name can only contain letters and spaces",
  });

const emailSchema = z.string().email({ message: "Invalid email address" });

// Define schemas
const loginUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),
});

const registerUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const updateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  avatar: z.string().url({ message: "Invalid URL" }).optional(),
  plan: z.string().optional(),
  storageUsed: z.number().optional(),
  deletedAt: z.date().nullable().optional(),
});

const updateUserPasswordSchema = z
  .object({
    oldPassword: z.string().min(1, { message: "Current password is required" }),
    newPassword: passwordSchema,
    confirmNewPassword: z
      .string()
      .min(1, { message: "Please confirm your new password" }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  });

const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: "Role must be either 'user' or 'admin'" }),
  }),
});

const adminSetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmNewPassword: z
      .string()
      .min(1, { message: "Please confirm the new password" }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export {
  loginUserSchema,
  refreshTokenSchema,
  registerUserSchema,
  updateUserPasswordSchema,
  updateUserRoleSchema,
  updateUserSchema,
  adminSetPasswordSchema,
};
