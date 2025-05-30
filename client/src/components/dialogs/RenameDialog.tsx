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
import { renameItemSchema } from "@/validation/folder.validation";
import { logger } from "@/lib/utils";
import { extractFieldError, getErrorMessage } from "@/utils/apiErrorHandler";
import { useRenameFile } from "@/api/file/file.query";
import { useRenameFolder } from "@/api/folder/folder.query";

export function RenameDialog() {
  const { 
    renameDialogOpen, 
    renameItemId, 
    renameItemCardType, 
    renameItemName,
    closeRenameDialog 
  } = useDialogStore();

  const renameFile = useRenameFile();
  const renameFolder = useRenameFolder();

  const form = useForm<z.infer<typeof renameItemSchema>>({
    resolver: zodResolver(renameItemSchema),
    defaultValues: {
      name: renameItemName || "",
      id: renameItemId || "",
      cardType: renameItemCardType || "folder",
    },
  });

  // Update form values when the dialog opens or item changes
  useEffect(() => {
    if (renameDialogOpen && renameItemId && renameItemCardType && renameItemName) {
      form.reset({
        name: renameItemName,
        id: renameItemId,
        cardType: renameItemCardType,
      });
    }
  }, [renameDialogOpen, renameItemId, renameItemCardType, renameItemName, form]);

  async function onSubmit(values: z.infer<typeof renameItemSchema>) {
    try {
      if (values.cardType === 'folder') {
        await renameFolder.mutateAsync({
          folderId: values.id,
          data: { name: values.name }
        });
      } else {
        await renameFile.mutateAsync({
          fileId: values.id,
          data: { name: values.name }
        });
      }
      
      toast.success("Item renamed successfully!");
      closeRenameDialog();
      form.reset();
    } catch (error: any) {
      logger.error("Rename error:", error);
      
      const fieldError = extractFieldError(error);
      
      if (fieldError && fieldError.field === "name" && error.response?.status === 409) {
        // Handle duplicate item
        const { openDuplicateDialog } = useDialogStore.getState();
        openDuplicateDialog(
          values.name,
          values.cardType === 'folder' ? 'folder' : 'file',
          async (action) => {
            try {
              if (values.cardType === 'folder') {
                await renameFolder.mutateAsync({
                  folderId: values.id,
                  data: { 
                    name: values.name,
                    duplicateAction: action
                  }
                });
              } else {
                await renameFile.mutateAsync({
                  fileId: values.id,
                  data: { 
                    name: values.name,
                    duplicateAction: action
                  }
                });
              }
              toast.success("Item renamed successfully!");
              closeRenameDialog();
              form.reset();
            } catch (error: any) {
              logger.error("Rename error:", error);
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
      title="Rename Item"
      description="Enter a new name for this item."
      open={renameDialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeRenameDialog();
          form.reset();
        }
      }}
      contentClassName="max-h-[80svh] max-md:-mt-8.5 overflow-y-auto gap-0"
      headerClassName="p-6 max-md:pt-8 pb-4 md:p-8 md:pb-6 border-b bg-muted/50"
      bodyClassName="p-6 md:p-8 gap-8"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Item Name Field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter new name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Hidden Fields */}
          <input type="hidden" {...form.register("id")} />
          <input type="hidden" {...form.register("cardType")} />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeRenameDialog}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={form.formState.isSubmitting}
              disabled={form.formState.isSubmitting}
            >
              Rename
            </Button>
          </div>
        </form>
      </Form>
    </ResponsiveDialog>
  );
}