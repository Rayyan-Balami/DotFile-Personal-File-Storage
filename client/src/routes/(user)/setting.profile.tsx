import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Sun, Moon, Airplay, Upload, User } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAuthStore } from "@/stores/authStore";
import { useUpdateProfile, useUpdatePassword, useUpdateAvatar } from "@/api/user/user.query";
import { 
  updateUserSchema, 
  updateUserPasswordSchema, 
  avatarFileSchema,
  UpdateUserInput, 
  UpdateUserPasswordInput
} from "@/validation/authForm";
import { toast } from "sonner";
import { getErrorMessage, extractFieldError } from "@/utils/apiErrorHandler";

export const Route = createFileRoute("/(user)/setting/profile")({
  component: Component,
});

export default function Component() {
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
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
      if (fieldError && ["oldPassword", "newPassword", "confirmNewPassword"].includes(fieldError.field)) {
        passwordForm.setError(fieldError.field as keyof UpdateUserPasswordInput, {
          type: "manual",
          message: fieldError.message,
        });
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

    setSelectedAvatar(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Upload avatar
  async function handleAvatarUpload() {
    if (!selectedAvatar) return;

    try {
      const response = await updateAvatarMutation.mutateAsync(selectedAvatar);
      if (response.data?.data?.user) {
        updateUser(response.data.data.user);
        toast.success("Avatar updated successfully!");
        setSelectedAvatar(null);
        setAvatarPreview("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  }

  // Cancel avatar selection
  function handleAvatarCancel() {
    setSelectedAvatar(null);
    setAvatarPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Format storage display
  const formatStorage = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const storageUsed = user?.storageUsed || 0;
  const storageLimit = user?.maxStorageLimit || 0;
  const storagePercentage = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;

  return (
    <section className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and account settings
        </p>
      </div>

      {/* Tabs Component */}
      <Tabs defaultValue="profile" className="space-y-4 md:space-y-6">
        <TabsList className="h-10 p-1">
          <TabsTrigger value="profile" className="px-4">
            Profile
          </TabsTrigger>
          <TabsTrigger value="password" className="px-4">
            Password
          </TabsTrigger>
          <TabsTrigger value="appearance" className="px-4">
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent
          value="profile"
          className="max-w-screen-md space-y-4 md:space-y-6"
        >
          {/* Personal Information */}
          <Card className="shadow-none border-4 border-muted bg-sidebar">
            <CardHeader className="pb-4 md:pb-6">
              <CardTitle className="text-lg md:text-xl">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="size-20">
                    <AvatarImage 
                      src={avatarPreview || user?.avatar} 
                      alt={user?.name}
                    />
                    <AvatarFallback className="text-lg">
                      <User className="size-8" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex flex-col gap-2 items-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                    
                    {!selectedAvatar ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs"
                      >
                        <Upload className="size-3 mr-1" />
                        Change
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAvatarUpload}
                          loading={updateAvatarMutation.isPending}
                          className="text-xs"
                        >
                          Upload
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAvatarCancel}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Upload a new avatar. Must be an image file under 2MB.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: JPEG, PNG, GIF, WebP, BMP, TIFF
                  </p>
                </div>
              </div>

              <Separator />

              {/* Name and Email Form */}
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="name" className="text-sm font-medium">
                            Name
                          </FormLabel>
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

                    <FormItem>
                      <FormLabel htmlFor="email" className="text-sm font-medium">
                        Email
                      </FormLabel>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed for security reasons
                      </p>
                    </FormItem>
                  </div>

                  <Button 
                    type="submit"
                    loading={profileForm.formState.isSubmitting}
                    className="bg-foreground/90 text-background hover:bg-foreground hover:text-background"
                  >
                    Save Profile
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Storage Information */}
          <Card className="shadow-none border-4 border-muted bg-sidebar">
            <CardHeader className="pb-4 md:pb-6">
              <CardTitle className="text-lg md:text-xl">Storage Usage</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Monitor your file storage usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Used: {formatStorage(storageUsed)}</span>
                  <span>Limit: {formatStorage(storageLimit)}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      storagePercentage > 90 ? 'bg-destructive' :
                      storagePercentage > 70 ? 'bg-yellow-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {storagePercentage.toFixed(1)}% of storage used
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator className="my-4 md:my-6" />
          
          {/* Delete Account */}
          <div className="p-4 rounded-md border-4 border-destructive/5 bg-destructive/5">
            <div className="space-y-4 md:space-y-6">
              <div>
                <h3 className="text-lg md:text-xl text-destructive">
                  Delete account
                </h3>
                <p className="text-sm text-destructive/70">
                  Once you delete your account, all of your data will be
                  permanently removed. This action cannot be undone.
                </p>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="deleteConfirm"
                  className="text-sm font-medium text-destructive"
                >
                  Type <span className="font-bold">"{user?.name}"</span> to confirm
                </Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  className="w-full md:max-w-md bg-destructive/10 text-destructive placeholder:text-destructive/50 border-destructive/20 focus-visible:border-destructive focus-visible:ring-destructive/50"
                />
              </div>
              <Button
                variant="destructive"
                disabled={deleteConfirmName !== user?.name}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete account
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent
          value="password"
          className="max-w-screen-md space-y-4 md:space-y-6"
        >
          <Card className="shadow-none border-4 border-muted bg-sidebar">
            <CardHeader className="pb-4 md:pb-6">
              <CardTitle className="text-lg md:text-xl">Change Password</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 md:space-y-6">
                  <FormField
                    control={passwordForm.control}
                    name="oldPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="oldPassword" className="text-sm font-medium">
                          Current Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="oldPassword"
                            type="password"
                            disabled={passwordForm.formState.isSubmitting}
                            className="w-full md:max-w-md"
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
                        <FormLabel htmlFor="newPassword" className="text-sm font-medium">
                          New Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="newPassword"
                            type="password"
                            disabled={passwordForm.formState.isSubmitting}
                            className="w-full md:max-w-md"
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
                        <FormLabel htmlFor="confirmNewPassword" className="text-sm font-medium">
                          Confirm New Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="confirmNewPassword"
                            type="password"
                            disabled={passwordForm.formState.isSubmitting}
                            className="w-full md:max-w-md"
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
                    className="bg-foreground/90 text-background hover:bg-foreground hover:text-background"
                  >
                    Update Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent
          value="appearance"
          className="max-w-screen-md space-y-4 md:space-y-6"
        >
          <Card className="shadow-none border-4 border-muted bg-sidebar">
            <CardHeader className="pb-4 md:pb-6">
              <CardTitle className="text-lg md:text-xl">Appearance</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Customize the appearance of the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Theme</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select your preferred theme or sync with your system
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className="flex items-center gap-2"
                  >
                    <Sun className="size-4" />
                    Light
                  </Button>
                  
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className="flex items-center gap-2"
                  >
                    <Moon className="size-4" />
                    Dark
                  </Button>
                  
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("system")}
                    className="flex items-center gap-2"
                  >
                    <Airplay className="size-4" />
                    System
                  </Button>
                </div>

                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Current theme: <span className="font-medium">{theme}</span>
                  </p>
                  {theme === "system" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Following your system preference
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
