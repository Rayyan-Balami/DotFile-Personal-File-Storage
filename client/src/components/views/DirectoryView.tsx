import React, { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useSelectionStore,
  useKeyboardShortcuts,
} from "@/stores/useSelectionStore";
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
import { lazy, Suspense } from "react";
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

  // Apply sorting
  const sortedItems = useSortedItems(items);

  // Callback for opening items
  const handleOpenItem = (id: string) => {
    const item = sortedItems.find((item) => item.id === id);
    if (item) {
      if (item.type === "folder") {
        navigate({ to: `/folder/${item.id}` });
      } else {
        // Handle document opening logic
        console.log(`Opening document: ${item.title}`);
        // Implement document opening logic
      }
    }
  };

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
              {currentPath !== "/" && (
                <button
                  onClick={() =>
                    navigate({ to: parentId ? `/folder/${parentId}` : "/" })
                  }
                  className="text-sm text-muted-foreground hover:underline mb-2 flex items-center"
                >
                  ← Back to root
                </button>
              )}

              <h1 className="text-2xl font-bold">{directoryName}</h1>
              <p className="text-muted-foreground">
                {sortedItems.length}{" "}
                {sortedItems.length === 1 ? "item" : "items"}
              </p>
            </div>

            {folderArrangement === "separated" ? (
              <>
                {sortedItems.filter((item) => item.type === "folder").length >
                  0 && (
                  <section className="flex flex-col gap-4 mb-6">
                    <h2 className="text-lg font-medium">Folders</h2>
                    <CardGrid
                      items={sortedItems.filter(
                        (item) => item.type === "folder"
                      )}
                      viewType={viewType}
                      onOpen={handleOpenItem}
                    />
                  </section>
                )}

                {sortedItems.filter((item) => item.type === "document").length >
                  0 && (
                  <section className="flex flex-col gap-4">
                    <h2 className="text-lg font-medium">Files</h2>
                    <CardGrid
                      items={sortedItems.filter(
                        (item) => item.type === "document"
                      )}
                      viewType={viewType}
                      onOpen={handleOpenItem}
                    />
                  </section>
                )}
              </>
            ) : (
              <section className="flex flex-1 flex-col gap-4">
                <h2 className="text-lg font-medium">All Items</h2>
                <CardGrid
                  items={sortedItems}
                  viewType={viewType}
                  onOpen={handleOpenItem}
                />
              </section>
            )}

            {sortedItems.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <p>This folder is empty</p>
              </div>
            )}
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
