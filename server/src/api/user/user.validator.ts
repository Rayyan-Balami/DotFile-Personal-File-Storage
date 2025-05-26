import { z } from "zod";
import { UserRole } from "./user.dto.js";

/**
 * Strong password rules: 8-24 chars, upper, number, special
 */
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

/**
 * User name validation: 3-50 chars, letters and spaces
 */
const nameSchema = z
  .string()
  .min(3, { message: "Name must be at least 3 characters long" })
  .max(50, { message: "Name must be at most 50 characters long" })
  .regex(/^[a-zA-Z ]+$/, {
    message: "Name can only contain letters and spaces",
  });

/**
 * Valid email format check
 */
const emailSchema = z.string().email({ message: "Invalid email address" });

/**
 * Request validation schemas
 */
/**
 * Login: Validate email and password presence
 */
const loginUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),
});

/**
 * Registration: Full user details with password confirm
 */
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

/**
 * Profile update: Optional user fields
 */
const updateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  avatar: z.string().url({ message: "Invalid URL" }).optional(),
  maxStorageLimit: z.number().min(0).optional(),
  storageUsed: z.number().min(0).optional(),
  deletedAt: z.date().nullable().optional(),
});

/**
 * Password change: Current + new password with confirm
 */
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

/**
 * Token refresh: Optional refresh token
 */
const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

/**
 * Admin: Role update between user/admin
 */
const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: "Role must be either 'user' or 'admin'" }),
  }),
});

/**
 * Admin: Set user password with confirm
 */
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

/**
 * Admin: Set user storage quota (bytes)
 */
const updateStorageLimitSchema = z.object({
  maxStorageLimit: z.number().min(0, { message: "Storage limit cannot be negative" }),
});

export {
  adminSetPasswordSchema, loginUserSchema,
  refreshTokenSchema,
  registerUserSchema, updateStorageLimitSchema, updateUserPasswordSchema,
  updateUserRoleSchema,
  updateUserSchema
};
