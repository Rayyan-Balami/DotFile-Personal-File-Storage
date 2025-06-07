import {
  useUpdateAvatar,
  useUpdatePassword,
  useUpdateProfile,
} from "@/api/user/user.query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatBytes, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { extractFieldError, getErrorMessage } from "@/utils/apiErrorHandler";
import {
  avatarFileSchema,
  UpdateUserInput,
  UpdateUserPasswordInput,
  updateUserPasswordSchema,
  updateUserSchema,
} from "@/validation/authForm";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { VITE_API_URL } from "@/config/constants";
import DeleteAccountDialog from "@/components/dialogs/DeleteAccountDialog";

export const Route = createFileRoute("/(user)/setting/profile")({
  component: RouteComponent,
});

export default function RouteComponent() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfileMutation = useUpdateProfile();
  const updatePasswordMutation = useUpdatePassword();
  const updateAvatarMutation = useUpdateAvatar();

  // Profile form (only name is editable)
  const profileForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user?.name || "",
    },
  });

  // Password form
  const passwordForm = useForm<UpdateUserPasswordInput>({
    resolver: zodResolver(updateUserPasswordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
      });
    }
  }, [user, profileForm]);

  // Return early if no user - after all hooks
  if (!user) {
    return null;
  }

  // Profile update handler (name only)
  async function onProfileSubmit(values: UpdateUserInput) {
    try {
      const response = await updateProfileMutation.mutateAsync(values);
      if (response.data?.data?.user) {
        updateUser(response.data.data.user);
        toast.success("Profile updated successfully!");
      }
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
  async function onPasswordSubmit(values: UpdateUserPasswordInput) {
    try {
      await updatePasswordMutation.mutateAsync(values);
      toast.success("Password updated successfully!");
      passwordForm.reset();
    } catch (error: any) {
      const fieldError = extractFieldError(error);
      if (
        fieldError &&
        ["oldPassword", "newPassword", "confirmNewPassword"].includes(
          fieldError.field
        )
      ) {
        passwordForm.setError(
          fieldError.field as keyof UpdateUserPasswordInput,
          {
            type: "manual",
            message: fieldError.message,
          }
        );
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  }

  // Handle avatar file selection
  function handleAvatarSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = avatarFileSchema.safeParse({ file });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Upload avatar
  async function handleAvatarUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    try {
      const response = await updateAvatarMutation.mutateAsync(file);
      if (response.data?.data?.user) {
        updateUser(response.data.data.user);
        toast.success("Avatar updated successfully!");
        setAvatarPreview("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  }

  // Handle delete account
  function handleDeleteAccount() {
    setDeleteDialogOpen(true);
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
        </div>
      </div>

      <div>
        <h4 className="text-xl font-medium">Profile Settings</h4>
        <p className="text-sm text-muted-foreground">
          Manage your profile information, avatar, password, and storage here.
        </p>
      </div>

      <Separator />

      {/* name and email section */}
      <div className="flex flex-col md:flex-row items-start flex-wrap gap-6">
        <div className="w-xs">
          <h5 className="font-medium">My Information</h5>
          <p className="text-sm text-muted-foreground">
            Update your profile information.
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
                  <FormControl>
                    <Input
                      id="name"
                      disabled={profileForm.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Input
                id="email"
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
              Save Changes
            </Button>
          </form>
        </Form>
      </div>

      <Separator />

      {/* Avatar section */}
      <div className="flex flex-col md:flex-row items-start flex-wrap gap-6">
        <div className="w-xs">
          <h5 className="font-medium">Avatar</h5>
          <p className="text-sm text-muted-foreground">
            Update your profile picture
          </p>
        </div>
        <div className="flex flex-1 w-full max-w-lg gap-4">
          <Avatar className="size-22.5 border rounded-md">
            <AvatarImage
              src={
                avatarPreview ||
                (user?.avatar ? `${VITE_API_URL}${user.avatar}` : undefined)
              }
              alt={user?.name}
            />
            <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-dashed"
            >
              Choose Avatar
            </Button>
            <Button
              type="button"
              onClick={handleAvatarUpload}
              loading={updateAvatarMutation.isPending}
              disabled={updateAvatarMutation.isPending || !avatarPreview}
              className="bg-foreground/90 text-background hover:bg-foreground hover:text-background"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Password section */}
      <div className="flex flex-col md:flex-row items-start flex-wrap gap-6">
        <div className="w-xs">
          <h5 className="font-medium">Password</h5>
          <p className="text-sm text-muted-foreground">
            Update your account password
          </p>
        </div>
        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className="flex-1 w-full max-w-lg space-y-4"
          >
            <FormField
              control={passwordForm.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      id="oldPassword"
                      type="password"
                      placeholder="Current Password"
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
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="New Password"
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
                  <FormControl>
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      placeholder="Confirm New Password"
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

      {/* Storage section */}
      <div className="flex flex-col md:flex-row items-start flex-wrap gap-6">
        <div className="w-xs">
          <h5 className="font-medium">Storage</h5>
          <p className="text-sm text-muted-foreground">
            View your storage usage and limits
          </p>
        </div>
        <div className="flex-1 space-y-4 max-w-lg">
          <Badge
            variant="secondary"
            className="truncate h-6 rounded-full text-xs font-normal"
          >
            {user && user.maxStorageLimit > 0
              ? ((user.storageUsed / user.maxStorageLimit) * 100).toFixed(0)
              : 0}
            % used
          </Badge>
          <Progress
            value={
              user && user.maxStorageLimit > 0
                ? Math.round((user.storageUsed / user.maxStorageLimit) * 100)
                : 0
            }
          />
          <span className="font-light text-xs">
            {user ? formatBytes(user.storageUsed) : "0 B"} of{" "}
            {user ? formatBytes(user.maxStorageLimit) : "0 B"}
          </span>
        </div>
      </div>

      <Separator />

      {/* Delete Account Section */}
      <div className="flex flex-col md:flex-row items-start flex-wrap gap-6">
        <div className="w-xs">
          <h5 className="font-medium text-destructive">Delete Account</h5>
          <p className="text-sm text-destructive/80">
            Permanently delete your account
          </p>
        </div>
        <div className="flex-1">
          <Button variant="destructive" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </section>
  );
}
