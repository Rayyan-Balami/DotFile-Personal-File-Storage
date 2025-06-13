import {
  useGetUserById,
  useSetUserPassword,
  useUpdateStorageLimit,
  useUpdateUser,
  useUpdateUserRole,
} from "@/api/user/user.query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { VITE_API_URL } from "@/config/constants";
import { extractFieldError, getErrorMessage } from "@/utils/apiErrorHandler";
import { formatFileSize } from "@/utils/formatUtils";
import { getInitials } from "@/utils/getInitials";
import { logger } from "@/utils/logger";
import {
  AdminSetPasswordInput,
  adminSetPasswordSchema,
  UpdateStorageLimitInput,
  updateStorageLimitSchema,
  UpdateUserInput,
  UpdateUserRoleInput,
  updateUserRoleSchema,
  updateUserSchema,
  UserRole,
} from "@/validation/authForm";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function AdminEditUserProfile() {
  const { id } = useParams({ strict: false }) as { id: string };
  const { data: userData, isLoading, error } = useGetUserById(id);
  const user = userData?.data?.user;

  const updateUserMutation = useUpdateUser();
  const setPasswordMutation = useSetUserPassword();
  const updateRoleMutation = useUpdateUserRole();
  const updateStorageMutation = useUpdateStorageLimit();

  // Profile form
  const profileForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
    },
  });

  // Password form (admin can set password without old password)
  const passwordForm = useForm<AdminSetPasswordInput>({
    resolver: zodResolver(adminSetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  // Role form
  const roleForm = useForm<UpdateUserRoleInput>({
    resolver: zodResolver(updateUserRoleSchema),
    defaultValues: {
      role: UserRole.USER,
    },
  });

  // Storage form
  const storageForm = useForm<UpdateStorageLimitInput>({
    resolver: zodResolver(updateStorageLimitSchema),
    defaultValues: {
      maxStorageLimit: 0,
    },
  });

  // Update forms when user data changes
  useEffect(() => {
    if (user) {
      logger.info("User role from server:", user.role);
      logger.info("UserRole.ADMIN:", UserRole.ADMIN);
      logger.info("UserRole.USER:", UserRole.USER);

      profileForm.reset({
        name: user.name || "",
      });
      roleForm.reset({
        role: (user.role as UserRole) || UserRole.USER,
      });
      storageForm.reset({
        maxStorageLimit: user.maxStorageLimit || 0,
      });

      logger.info("Role form value after reset:", roleForm.getValues().role);
    }
  }, [user, profileForm, roleForm, storageForm]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading user details...</div>
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-red-600">
          {error ? "Failed to load user details" : "User not found"}
        </div>
      </div>
    );
  }

  // Profile update handler
  async function onProfileSubmit(values: UpdateUserInput) {
    try {
      await updateUserMutation.mutateAsync({ id, data: values });
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      const fieldError = extractFieldError(error);
      if (fieldError && fieldError.field === "name") {
        profileForm.setError("name", {
          type: "manual",
          message: fieldError.message,
        });
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  }

  // Password update handler
  async function onPasswordSubmit(values: AdminSetPasswordInput) {
    try {
      await setPasswordMutation.mutateAsync({ id, data: values });
      toast.success("Password updated successfully!");
      passwordForm.reset();
    } catch (error: any) {
      const fieldError = extractFieldError(error);
      if (
        fieldError &&
        ["newPassword", "confirmNewPassword"].includes(fieldError.field)
      ) {
        passwordForm.setError(fieldError.field as keyof AdminSetPasswordInput, {
          type: "manual",
          message: fieldError.message,
        });
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  }

  // Role update handler
  async function onRoleSubmit(values: UpdateUserRoleInput) {
    try {
      await updateRoleMutation.mutateAsync({ id, data: values });
      toast.success("Role updated successfully!");
    } catch (error: any) {
      const fieldError = extractFieldError(error);
      if (fieldError && fieldError.field === "role") {
        roleForm.setError("role", {
          type: "manual",
          message: fieldError.message,
        });
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  }

  // Storage update handler
  async function onStorageSubmit(values: UpdateStorageLimitInput) {
    try {
      await updateStorageMutation.mutateAsync({ id, data: values });
      toast.success("Storage limit updated successfully!");
    } catch (error: any) {
      const fieldError = extractFieldError(error);
      if (fieldError && fieldError.field === "maxStorageLimit") {
        storageForm.setError("maxStorageLimit", {
          type: "manual",
          message: fieldError.message,
        });
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  }

  const initials = getInitials(user?.name || "");

  return (
    <section className="flex flex-1 flex-col gap-6 md:gap-8 p-4 md:p-6">
      {/* Top Profile Header Section */}
      <div className="flex items-center gap-6">
        <Avatar className="size-32 border rounded-md">
          <AvatarImage
            src={user?.avatar ? `${VITE_API_URL}${user.avatar}` : undefined}
            alt={user?.name}
          />
          <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <h3 className="text-2xl md:text-3xl font-semibold capitalize">
            {user?.name}
          </h3>
          <p className="text-muted-foreground text-lg">{user?.email}</p>
          <div className="flex items-center gap-2">
            <Badge className="border capitalize bg-blue-100 border-blue-500 text-blue-800">
              {user?.role || "User"}
            </Badge>
            <Badge
              className={`border capitalize ${
                user?.deletedAt
                  ? "bg-orange-100 border-orange-500 text-orange-800"
                  : "bg-green-100 border-green-500 text-green-800"
              }`}
            >
              {user?.deletedAt ? "soft Deleted" : "active"}
            </Badge>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xl font-medium">User Management</h4>
        <p className="text-sm text-muted-foreground">
          Manage user profile, role, password, and storage settings.
        </p>
      </div>

      <Separator />

      {/* Profile Information Section */}
      <div className="flex flex-col md:flex-row items-start flex-wrap gap-6">
        <div className="w-xs">
          <h5 className="font-medium">Profile Information</h5>
          <p className="text-sm text-muted-foreground">
            Update the user's profile information.
          </p>
        </div>
        <Form {...profileForm}>
          <form
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            className="flex-1 w-full max-w-lg space-y-4"
          >
            <FormField
              control={profileForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter full name"
                      disabled={profileForm.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Email Address</FormLabel>
              <Input
                type="email"
                value={user?.email || ""}
                disabled
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed for security reasons
              </p>
            </div>

            <Button
              type="submit"
              loading={profileForm.formState.isSubmitting}
              disabled={!profileForm.formState.isDirty}
              className="bg-foreground/90 text-background hover:bg-foreground hover:text-background"
            >
              Update Profile
            </Button>
          </form>
        </Form>
      </div>

      <Separator />

      {/* Role Management Section */}
      <div className="flex flex-col md:flex-row items-start flex-wrap gap-6">
        <div className="w-xs">
          <h5 className="font-medium">User Role</h5>
          <p className="text-sm text-muted-foreground">
            Change the user's role and permissions.
          </p>
        </div>
        <Form {...roleForm}>
          <form
            onSubmit={roleForm.handleSubmit(onRoleSubmit)}
            className="flex-1 w-full max-w-lg space-y-4"
          >
            <FormField
              control={roleForm.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Select
                      key={field.value}
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UserRole.USER}>User</SelectItem>
                        <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              loading={roleForm.formState.isSubmitting}
              disabled={!roleForm.formState.isDirty}
              className="bg-foreground/90 text-background hover:bg-foreground hover:text-background"
            >
              Update Role
            </Button>
          </form>
        </Form>
      </div>

      <Separator />

      {/* Password Section */}
      <div className="flex flex-col md:flex-row items-start flex-wrap gap-6">
        <div className="w-xs">
          <h5 className="font-medium">Update Password</h5>
          <p className="text-sm text-muted-foreground">
            Update the password for this user.
          </p>
        </div>
        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className="flex-1 w-full max-w-lg space-y-4"
          >
            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      disabled={passwordForm.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      disabled={passwordForm.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              loading={passwordForm.formState.isSubmitting}
              disabled={!passwordForm.formState.isDirty}
              className="bg-foreground/90 text-background hover:bg-foreground hover:text-background"
            >
              Update Password
            </Button>
          </form>
        </Form>
      </div>

      <Separator />

      {/* Storage Management Section */}
      <div className="flex flex-col md:flex-row items-start flex-wrap gap-6">
        <div className="w-xs">
          <h5 className="font-medium">Storage Management</h5>
          <p className="text-sm text-muted-foreground">
            View and update the user's storage limit.
          </p>
        </div>
        <div className="flex-1 space-y-4 max-w-lg">
          {/* Current Usage Display */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Storage Used</span>
              <span>{formatFileSize(user?.storageUsed || 0)}</span>
            </div>
            <Progress
              value={
                user && user.maxStorageLimit > 0
                  ? Math.min(
                      (user.storageUsed / user.maxStorageLimit) * 100,
                      100
                    )
                  : 0
              }
              className="w-full h-2"
            />
            <div className="text-xs text-muted-foreground">
              {user && user.maxStorageLimit > 0
                ? `${((user.storageUsed / user.maxStorageLimit) * 100).toFixed(1)}% of ${formatFileSize(user.maxStorageLimit)} used`
                : "No storage limit set"}
            </div>
          </div>

          {/* Storage Limit Form */}
          <Form {...storageForm}>
            <form
              onSubmit={storageForm.handleSubmit(onStorageSubmit)}
              className="space-y-4"
            >
              <FormField
                control={storageForm.control}
                name="maxStorageLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Storage Limit (bytes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter storage limit in bytes"
                        disabled={storageForm.formState.isSubmitting}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Converted size"
                        value={
                          field.value ? formatFileSize(field.value) : "0 B"
                        }
                        disabled
                        readOnly
                        className="bg-muted"
                      />
                      <Button
                        type="button"
                        variant={"outline"}
                        onClick={() => field.onChange(15 * 1024 * 1024)} // 15 MB
                      >
                        15 MB
                      </Button>
                      <Button
                        type="button"
                        variant={"outline"}
                        onClick={() => field.onChange(75 * 1024 * 1024)} // 75 MB
                      >
                        75 MB
                      </Button>
                      <Button
                        type="button"
                        variant={"outline"}
                        onClick={() => field.onChange(200 * 1024 * 1024)} // 200 MB
                      >
                        200 MB
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                loading={storageForm.formState.isSubmitting}
                disabled={!storageForm.formState.isDirty}
                className="bg-foreground/90 text-background hover:bg-foreground hover:text-background"
              >
                Update Storage Limit
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </section>
  );
}
