import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useDeleteAccount } from "@/api/user/user.query";
import {
  deleteUserAccountSchema,
  DeleteUserAccountInput,
} from "@/validation/authForm";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { extractFieldError, getErrorMessage } from "@/utils/apiErrorHandler";
import { useRouter } from "@tanstack/react-router";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteAccountDialog({
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const deleteAccountMutation = useDeleteAccount();
  const router = useRouter();

  const form = useForm<DeleteUserAccountInput>({
    resolver: zodResolver(deleteUserAccountSchema),
    defaultValues: {
      password: "",
    },
  });

  const handleDeleteAccount = async (values: DeleteUserAccountInput) => {
    try {
      await deleteAccountMutation.mutateAsync(values);
      toast.success("Account deleted successfully. You have been logged out.");
      onOpenChange(false);
      // Navigate to register page after account deletion
      router.navigate({ to: "/register" });
    } catch (error: any) {
      const fieldError = extractFieldError(error);
      if (fieldError && fieldError.field === "password") {
        form.setError("password", {
          type: "manual",
          message: fieldError.message,
        });
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Account"
      description="This action cannot be undone. All your files, folders, and account data will be permanently deleted from our system."
      contentClassName="max-h-[80svh] max-md:-mt-8.5 gap-0"
      headerClassName="p-6 max-md:pt-8 pb-4 md:p-8 md:pb-6 border-b bg-muted *:text-destructive"
      bodyClassName="p-6 md:p-8 gap-8"
    >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleDeleteAccount)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enter your password to confirm deletion</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Your current password"
                      disabled={form.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                loading={form.formState.isSubmitting}
                disabled={!form.watch("password")}
              >
                Delete Account
              </Button>
            </div>
          </form>
        </Form>
    </ResponsiveDialog>
  );
}
