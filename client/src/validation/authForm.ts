import { z } from "zod";

/**
 * Available user role types (matching server-side enum)
 */
export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

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
  // Email updates removed for security - handle through separate verification process
  maxStorageLimit: z.number().min(0).optional(),
  storageUsed: z.number().min(0).optional(),
  deletedAt: z.date().nullable().optional(),
});

// Avatar file validation schema
const avatarFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 2 * 1024 * 1024, {
      message: "File size must be less than 2MB",
    })
    .refine(
      (file) => ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff"].includes(file.type),
      {
        message: "File must be an image (JPEG, PNG, GIF, WebP, BMP, or TIFF)",
      }
    ),
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

/**
 * Delete user account validation - requires password confirmation
 */
const deleteUserAccountSchema = z.object({
  password: z.string().min(1, { message: "Password is required to delete your account" }),
});

// Fix type exports using proper syntax
type LoginUserInput = z.infer<typeof loginUserSchema>;
type RegisterUserInput = z.infer<typeof registerUserSchema>;
type UpdateUserInput = z.infer<typeof updateUserSchema>;
type UpdateUserPasswordInput = z.infer<typeof updateUserPasswordSchema>;
type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
type AdminSetPasswordInput = z.infer<typeof adminSetPasswordSchema>;
type UpdateStorageLimitInput = z.infer<typeof updateStorageLimitSchema>;
type AvatarFileInput = z.infer<typeof avatarFileSchema>;
type DeleteUserAccountInput = z.infer<typeof deleteUserAccountSchema>;

export {
  loginUserSchema,
  registerUserSchema,
  updateUserPasswordSchema,
  updateUserSchema,
  refreshTokenSchema,
  updateUserRoleSchema,
  adminSetPasswordSchema,
  updateStorageLimitSchema,
  avatarFileSchema,
  deleteUserAccountSchema,
};

export type {
  LoginUserInput,
  RegisterUserInput,
  UpdateUserInput,
  UpdateUserPasswordInput,
  RefreshTokenInput,
  UpdateUserRoleInput,
  AdminSetPasswordInput,
  UpdateStorageLimitInput,
  AvatarFileInput,
  DeleteUserAccountInput,
};
