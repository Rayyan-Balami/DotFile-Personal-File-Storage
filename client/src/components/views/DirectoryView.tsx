import React, { useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useSelectionStore,
  useKeyboardShortcuts,
} from "@/stores/useSelectionStore";
import { useSortPreferencesStore } from "@/stores/useSortPreferencesStore";
import { useViewPreferencesStore } from "@/stores/useViewPreferencesStore";
import { useSortedItems, getMimeCategory } from "@/utils/sortUtils";
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
import { mapToFileSystemItem } from "@/utils/itemMapper";
import { useFileSystemStore } from "@/stores/useFileSystemStore";

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
  showTrashActions?: boolean;
}

export default function DirectoryView({
  items = [],
  directoryName = "Directory",
  parentId = null,
  showTrashActions = false,
}: DirectoryViewProps) {
  const navigate = useNavigate();
  const setVisibleItems = useSelectionStore((state) => state.setVisibleItems);
  const addItem = useFileSystemStore((state) => state.addItem);
  const sortBy = useSortPreferencesStore((state) => state.sortBy);
  const folderArrangement = useSortPreferencesStore((state) => state.folderArrangement);
  const viewType = useViewPreferencesStore((state) => state.viewType);

  // Map the items to ensure they have cardType
  const mappedItems = useMemo(() => items.map(mapToFileSystemItem), [items]);

  // Sync items with the store
  useEffect(() => {
    mappedItems.forEach(item => {
      addItem(item);
    });
  }, [mappedItems, addItem]);

  // Use the proper sorting hook with mapped items
  const sortedItems = useSortedItems(mappedItems);

  // Pre-filter items for better performance
  const folders = sortedItems.filter((item) => item.cardType === "folder");
  const documents = sortedItems.filter((item) => item.cardType === "document");

  // Group documents by MIME type when sorting by kind
  const groupedDocuments = useMemo(() => {
    if (sortBy !== "kind") return { "Files": documents };

    const groups: Record<string, FileSystemItem[]> = {};
    
    // Add folders group
    if (folders.length > 0) {
      groups["Folders"] = folders;
    }

    // Group documents by MIME category
    documents.forEach(doc => {
      const category = getMimeCategory(doc.type);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(doc);
    });

    return groups;
  }, [documents, folders, sortBy]);

  // Callback for opening items (double click)
  const handleOpenItem = (id: string) => {
    const isDeleting = useSelectionStore.getState().isDeleting;
    if (isDeleting) {
      return;
    }

    const item = sortedItems.find((item) => item.id === id);
    if (!item) return;
    
    if (item.cardType === "folder") {
      navigate({ to: `/folder/${item.id}` });
    } else {
      // Handle document opening - for now just log it
      // TODO: Implement document opening logic (preview/download)
      console.log(`Opening document: ${item.name}`);
    }
  };

  // Callback for selecting items (single click)
  const handleSelectItem = (id: string, event: React.MouseEvent) => {
    const isDeleting = useSelectionStore.getState().isDeleting;
    if (isDeleting) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // All items (both folders and documents) should just be selected on single click
    const item = sortedItems.find((item) => item.id === id);
    if (item) {
      // Let the selection store handle the selection
      useSelectionStore.getState().handleItemClick(id, event);
    }
  };

  // Register keyboard shortcuts with the open callback
  useKeyboardShortcuts(handleOpenItem);

  // Update visible items for selection when sorted items change
  useEffect(() => {
    setVisibleItems(sortedItems);
  }, [sortedItems, setVisibleItems]);

  return (
    <FileDropZone>
      <ContextMenu modal={false}>
        <ContextMenuTrigger asChild>
          <section className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6">
            <div className="mb-2">
              <h1 className="text-2xl font-bold">{directoryName}</h1>
              <p className="text-muted-foreground">
                {sortedItems.length}{" "}
                {sortedItems.length === 1 ? "item" : "items"}
              </p>
            </div>

            {folderArrangement === "separated" ? (
              <>
                {folders.length > 0 && sortBy !== "kind" && (
                  <section className="flex flex-col gap-4 mb-6">
                    <h2 className="text-lg font-medium">Folders</h2>
                    <CardGrid
                      items={folders}
                      viewType={viewType}
                      onItemClick={handleSelectItem}
                      onItemOpen={handleOpenItem}
                    />
                  </section>
                )}

                {sortBy === "kind" ? (
                  // Show grouped items when sorting by kind
                  Object.entries(groupedDocuments).map(([groupName, items]) => (
                    items.length > 0 && (
                      <section key={groupName} className="flex flex-col gap-4 mb-6">
                        <h2 className="text-lg font-medium capitalize">{groupName}</h2>
                        <CardGrid
                          items={items}
                          viewType={viewType}
                          onItemClick={handleSelectItem}
                          onItemOpen={handleOpenItem}
                        />
                      </section>
                    )
                  ))
                ) : (
                  // Show regular files section when not sorting by kind
                  documents.length > 0 && (
                    <section className="flex flex-col gap-4">
                      <h2 className="text-lg font-medium">Files</h2>
                      <CardGrid
                        items={documents}
                        viewType={viewType}
                        onItemClick={handleSelectItem}
                        onItemOpen={handleOpenItem}
                      />
                    </section>
                  )
                )}
              </>
            ) : (
              <section className="flex flex-1 flex-col gap-4">
                <h2 className="text-lg font-medium">All Items</h2>
                <CardGrid
                  items={sortedItems}
                  viewType={viewType}
                  onItemClick={handleSelectItem}
                  onItemOpen={handleOpenItem}
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
            <LazyGlobalMenuItems parentId={parentId} />
          </Suspense>
        </ContextMenuContent>
      </ContextMenu>
    </FileDropZone>
  );
}