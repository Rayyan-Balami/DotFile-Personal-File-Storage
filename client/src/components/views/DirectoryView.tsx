import React, { useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSelectionStore } from "@/stores/useSelectionStore";
import { useKeyboardShortcuts } from "@/stores/useSelectionStore";
import { useSortPreferencesStore } from "@/stores/useSortPreferencesStore";
import { useViewPreferencesStore } from "@/stores/useViewPreferencesStore";
import { useSortedItems } from "@/utils/sortUtils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Loader2 } from "lucide-react";
import { FileDropZone } from "../dnd/FileDropZone";
import { CardGrid } from "./CardGrid";
import { FileSystemItem } from "@/types/folderDocumnet";

// Lazy load context menu items
const LazyGlobalMenuItems = lazy(() =>
  import("@/components/menuItems/GlobalMenuItems").then((module) => ({
    default: module.ContextMenuItems,
  }))
);

interface DirectoryViewProps {
  items?: FileSystemItem[];
  currentPath?: string;
  directoryName?: string;
  parentId?: string | null;
}

export default function DirectoryView({
  items = [],
  currentPath = "/",
  directoryName = "Directory",
  parentId = null,
}: DirectoryViewProps) {
  const navigate = useNavigate();
  const setVisibleItems = useSelectionStore((state) => state.setVisibleItems);
  const handleSelection = useSelectionStore((state) => state.handleItemClick);

  // Apply sorting
  const sortedItems = useSortedItems(items);

  // Callback for opening items
  const handleOpenItem = useCallback(
    (id: string) => {
      const item = sortedItems.find((item) => item.id === id);
      if (item) {
        if (item.type === "folder") {
          navigate({ to: `/folder/${item.id}` });
        } else {
          // Handle document opening logic
          console.log(`Opening document: ${item.name}`);
          // Implement document opening logic
        }
      }
    },
    [sortedItems, navigate]
  );

  // Handle item clicks for both selection and opening
  const handleItemClick = useCallback(
    (id: string, event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      handleSelection(id, event, () => handleOpenItem(id));
    },
    [handleSelection, handleOpenItem]
  );

  // Register keyboard shortcuts with the open callback
  useKeyboardShortcuts(handleOpenItem);

  // Update visible items for selection when sorted items change
  useEffect(() => {
    setVisibleItems(sortedItems);
  }, [sortedItems, setVisibleItems]);

  // Get view preferences
  const viewType = useViewPreferencesStore((state) => state.viewType);
  const folderArrangement = useSortPreferencesStore(
    (state) => state.folderArrangement
  );

  return (
    <FileDropZone>
      <ContextMenu modal={false}>
        <ContextMenuTrigger asChild>
          <section className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6">
            <div className="mb-2">
              <CardGrid
                items={sortedItems}
                viewType={viewType}
                onItemClick={handleItemClick}
              />
            </div>
          </section>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <Suspense
            fallback={
              <ContextMenuItem disabled>
                <Loader2 className="animate-spin mx-auto" />
              </ContextMenuItem>
            }
          >
            <LazyGlobalMenuItems />
          </Suspense>
        </ContextMenuContent>
      </ContextMenu>
    </FileDropZone>
  );
}
