"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { toast } from "sonner";
import { useDialogStore } from "@/stores/useDialogStore";
import { useCreateFolder } from "@/api/folder/folder.query";
import { createFolderSchema } from "@/validation/folder.validation";
import { logger } from "@/lib/utils";
import { extractFieldError, getErrorMessage } from "@/utils/apiErrorHandler";

export function CreateFolderDialog() {
  const { createFolderOpen, createFolderParentId, closeCreateFolderDialog } =
    useDialogStore();

  const form = useForm<z.infer<typeof createFolderSchema>>({
    resolver: zodResolver(createFolderSchema),
    defaultValues: {
      name: "",
      parent: createFolderParentId,
    },
  });

  // Update form values when the dialog opens or parent changes
  useEffect(() => {
    if (createFolderOpen) {
      // Reset the form with proper initial values
      form.reset({
        name: "",
        parent: createFolderParentId,
      });
    }
  }, [createFolderOpen, createFolderParentId, form]);

  const createFolder = useCreateFolder();
  
  async function onSubmit(values: z.infer<typeof createFolderSchema>) {
    try {
      await createFolder.mutateAsync(values);
      toast.success("Folder created successfully!");
      closeCreateFolderDialog();
      form.reset({ name: "", parent: null });
    } catch (error: any) {
      logger.error("Create folder error:", error);
      
      const fieldError = extractFieldError(error);
      
      if (fieldError && fieldError.field === "name" && error.response?.status === 409) {
        // Handle duplicate folder
        const { openDuplicateDialog } = useDialogStore.getState();
        openDuplicateDialog(
          values.name,
          "folder",
          async (action) => {
            try {
              await createFolder.mutateAsync({
                ...values,
                duplicateAction: action
              });
              toast.success("Folder created successfully!");
              closeCreateFolderDialog();
              form.reset({ name: "", parent: null });
            } catch (error: any) {
              logger.error("Create folder error:", error);
              toast.error(getErrorMessage(error));
            } finally {
              // Always close the duplicate dialog
              useDialogStore.getState().closeDuplicateDialog();
            }
          }
        );
      } else if (fieldError && fieldError.field === "name") {
        form.setError("name", {
          type: "manual",
          message: fieldError.message
        });
      } else {
        toast.error(fieldError?.message || getErrorMessage(error));
      }
    }
  }

  return (
    <ResponsiveDialog
      title="Create a new folder"
      description="Enter a name for your new folder."
      open={createFolderOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeCreateFolderDialog();
          form.reset({ name: "", parent: null });
        }
      }}
      contentClassName="max-h-[80svh] max-md:-mt-8.5 overflow-y-auto gap-0"
      headerClassName="p-6 max-md:pt-8 pb-4 md:p-8 md:pb-6 border-b bg-muted"
      bodyClassName="p-6 md:p-8 gap-8"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Folder Name Field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Folder Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter folder name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Hidden Parent Field */}
          <input type="hidden" {...form.register("parent")} />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeCreateFolderDialog}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={form.formState.isSubmitting}
              disabled={form.formState.isSubmitting}
            >
              Create Folder
            </Button>
          </div>
        </form>
      </Form>
    </ResponsiveDialog>
  );
}
