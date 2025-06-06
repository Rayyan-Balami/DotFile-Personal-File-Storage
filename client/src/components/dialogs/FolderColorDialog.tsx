"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDialogStore } from "@/stores/useDialogStore";
import { useUpdateFolder } from "@/api/folder/folder.query";
import { colorMap, type ColorOption } from "@/config/colors";
import { FolderIcon } from "@/components/ui/folder-icon";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/apiErrorHandler";
import { Squircle } from "lucide-react";

export default function FolderColorDialog() {
  const {
    folderColorDialogOpen,
    folderColorItemId,
    folderColorItemName,
    folderColorCurrentColor,
    closeFolderColorDialog,
  } = useDialogStore();

  const [selectedColor, setSelectedColor] = useState<ColorOption>(
    (folderColorCurrentColor as ColorOption) || "default"
  );

  const updateFolder = useUpdateFolder();
  const colors = Object.keys(colorMap) as ColorOption[];

  useEffect(() => {
    setSelectedColor((folderColorCurrentColor as ColorOption) || "default");
  }, [folderColorCurrentColor, folderColorDialogOpen]);

  const handleSave = async () => {
    if (!folderColorItemId) return;
    try {
      await updateFolder.mutateAsync({
        folderId: folderColorItemId,
        data: { color: selectedColor },
      });
      toast.success(`${folderColorItemName} color updated successfully`);
      closeFolderColorDialog();
    } catch (error) {
      console.error("Color update error:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const handleCancel = () => {
    setSelectedColor((folderColorCurrentColor as ColorOption) || "default");
    closeFolderColorDialog();
  };

  return (
    <ResponsiveDialog
      title="Choose Folder Color"
      description={`Pick a color for "${folderColorItemName}"`}
      open={folderColorDialogOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      contentClassName="max-h-[80svh] max-md:-mt-8.5 gap-0"
      headerClassName="p-6 max-md:pt-8 pb-4 md:p-8 md:pb-6 border-b bg-muted"
      bodyClassName="p-6 md:p-8 space-y-6"
    >
      {/* Top Folder Preview */}
      <div className="flex justify-center">
        <FolderIcon className="w-16 h-16" color={selectedColor} />
      </div>

      {/* Squircle Color Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(32px,1fr))] gap-2 justify-center">
        {colors.map((color) => (
          <TooltipProvider key={color}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSelectedColor(color)}
                  className="relative p-1 rounded-md transition-transform hover:scale-110"
                >
                  <Squircle
                    className="w-6 h-6 stroke-2 transition-transform"
                    fill={colorMap[color].secondary}
                    stroke={colorMap[color].primary}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="capitalize">{color}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={updateFolder.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="border border-border"
          onClick={() => setSelectedColor("default")}
          disabled={updateFolder.isPending}
        >
          Reset
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateFolder.isPending}
          loading={updateFolder.isPending}
        >
          Apply
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
