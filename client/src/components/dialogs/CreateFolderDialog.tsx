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

const FormSchema = z.object({
  name: z.string().min(1, "Folder name is required."),
  parent: z.string().nullable(),
});

export function CreateFolderDialog() {
  const { createFolderOpen, createFolderParentId, closeCreateFolderDialog } = useDialogStore();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      parent: createFolderParentId,
    },
  });

  // Update parent id when it changes in the store
  useEffect(() => {
    form.setValue("parent", createFolderParentId);
  }, [createFolderParentId, form]);

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast("Folder created successfully!", {
      description: "Sunday, December 03, 2023 at 9:00 AM",
      action: {
        label: "Undo",
        onClick: () => console.log("Undo"),
      },
    });
    console.log(data);
    closeCreateFolderDialog();
    form.reset();
  }

  return (
    <ResponsiveDialog
      title="Create a new folder"
      description="Enter a name for your new folder."
      open={createFolderOpen}
      onOpenChange={(open) => {
        if (!open) closeCreateFolderDialog();
      }}
      contentClassName="max-w-md"
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
            >
              Cancel
            </Button>
            <Button type="submit">Create Folder</Button>
          </div>
        </form>
      </Form>
    </ResponsiveDialog>
  );
}