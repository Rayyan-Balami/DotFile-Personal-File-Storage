import { UserRole } from "@api/user/user.dto.js";
import { z } from "zod";

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
 * Note: Email updates removed for security - handle through separate verification process
 * Note: Avatar updates removed - use separate avatar upload endpoint for security
 */
const updateUserSchema = z.object({
  name: nameSchema.optional(),
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
  maxStorageLimit: z
    .number()
    .min(0, { message: "Storage limit cannot be negative" }),
});

/**
 * Account deletion: Require password confirmation for security
 */
const deleteUserAccountSchema = z.object({
  password: z
    .string()
    .min(1, { message: "Password is required to delete account" }),
});

/**
 * User pagination query validation
 */
const userPaginationQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, {
      message: "Page must be a positive number",
    })
    .optional(),
  pageSize: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, {
      message: "Page size must be between 1 and 100",
    })
    .optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  searchFields: z.string().optional(),
  filters: z.string().optional(),
  // Date range filter support
  createdAtStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "createdAtStart must be in YYYY-MM-DD format",
    })
    .optional(),
  createdAtEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "createdAtEnd must be in YYYY-MM-DD format",
    })
    .optional(),
});

const userIdSchema = z.object({
  userIds: z.array(z.string()),
});

export {
  adminSetPasswordSchema,
  deleteUserAccountSchema,
  loginUserSchema,
  refreshTokenSchema,
  registerUserSchema,
  updateStorageLimitSchema,
  updateUserPasswordSchema,
  updateUserRoleSchema,
  updateUserSchema,
  userIdSchema,
  userPaginationQuerySchema,
};
