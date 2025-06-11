import {
  useUpdateAvatar,
  useUpdatePassword,
  useUpdateProfile,
} from "@/api/user/user.query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { VITE_API_URL } from "@/config/constants";
import { useAuthStore } from "@/stores/authStore";
import { extractFieldError, getErrorMessage } from "@/utils/apiErrorHandler";
import { getInitials } from "@/utils/getInitials";
import {
  avatarFileSchema,
  UpdateUserInput,
  UpdateUserPasswordInput,
  updateUserPasswordSchema,
  updateUserSchema,
} from "@/validation/authForm";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";


export default function AdminProfile() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [avatarPreview, setAvatarPreview] = useState<string>("");
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

  const initials = getInitials(user?.name || "");

  return (
    <>
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
    </>
  );
}
