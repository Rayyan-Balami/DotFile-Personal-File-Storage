import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { SiteHeader } from "./components/header/site-header";
import { SiteFooter } from "./components/footer/site-footer";
import {
  SelectableItem,
  useKeyboardShortcuts,
  useSelectionStore,
} from "./store/useSelectionStore";
import { FileSystemDndProvider } from "./components/dnd/FileSystemDndContext";
import { DraggableFolderCard } from "./components/cards/DraggableFolderCard";
import {
  initializeFileSystem,
  useFileSystemStore,
} from "./store/useFileSystemStore";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Loader2 } from "lucide-react";
import { CardVariant } from "./components/cards/FolderDocumentCard";
import { ViewOptions } from "./components/footer/view-options";
import { useViewPreferencesStore } from "./store/useViewPreferencesStore";
import { useSortedItems } from "@/utils/sortUtils";
import { useSortPreferencesStore } from "@/store/useSortPreferencesStore";

const CARD_DATA = [
  {
    id: "folder-1",
    type: "folder" as const,
    color: "default",
    title: "Project Assets",
    itemCount: 12,
    previewUrl: "",
  },
  {
    id: "folder-2",
    type: "folder" as const,
    color: "blue",
    title: "Design Files",
    itemCount: 8,
    previewUrl: "",
  },
  {
    id: "doc-1",
    type: "document" as const,
    title: "Financial Report.pdf",
    itemCount: 1,
    fileExtension: "doc",
    previewUrl: "",
  },
  {
    id: "doc-2",
    type: "document" as const,
    title: "Presentation.ppt",
    itemCount: 1,
    fileExtension: "pdf",
    previewUrl: "",
  },
  {
    id: "doc-3",
    type: "document" as const,
    title: "Spreadsheet.xlsx",
    itemCount: 1,
    fileExtension: "png",
    previewUrl: "",
  },
  {
    id: "doc-4",
    type: "document" as const,
    title: "Product Photo.jpg",
    itemCount: 1,
    fileExtension: "jpg",
    previewUrl:
      "https://images.unsplash.com/photo-1741732311526-093a69d005d9?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHw0NHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "doc-5",
    type: "document" as const,
    title: "Marketing Image.png",
    itemCount: 1,
    fileExtension: "png",
    previewUrl:
      "https://images.unsplash.com/photo-1682687982167-d7fb3ed8541d?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDF8MHxlZGl0b3JpYWwtZmVlZHwxfHx8ZW58MHx8fHx8",
  },
];

const USERS = [
  { image: "https://github.com/shadcn.png", fallback: "CN" },
  { image: "https://github.com/shadcn.png", fallback: "CN" },
  { image: "https://github.com/shadcn.png", fallback: "CN" },
  { fallback: "+3" },
];

const LazyGlobalMenuItems = lazy(() =>
  import("@/components/context/GlobalMenuItems").then((module) => ({
    default: module.ContextMenuItems,
  }))
);

function CardGrid({ items, viewType, users, onOpen }) {
  return (
    <div
      className={`grid ${
        viewType === "large"
          ? "grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4 md:gap-6"
          : viewType === "compact"
          ? "grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4 md:gap-6"
          : "grid-cols-1 gap-0.5"
      }`}
    >
      {items.map((item, i) => (
        <DraggableFolderCard
          key={item.id}
          id={item.id}
          variant={viewType}
          alternateBg={viewType === "list" && i % 2 !== 0}
          type={item.type}
          color={item.color ?? "default"}
          title={item.title}
          itemCount={item.itemCount}
          users={users}
          isPinned={item.id.includes("-2")}
          fileExtension={item.fileExtension || "pdf"}
          previewUrl={item.previewUrl}
          onOpen={() => onOpen(item.id)}
        />
      ))}
    </div>
  );
}

export default function Page() {
  useEffect(() => {
    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", disableRightClick);
    return () => document.removeEventListener("contextmenu", disableRightClick);
  }, []);

  useEffect(() => {
    initializeFileSystem(CARD_DATA);
  }, []);

  const items = useFileSystemStore((state) => state.items);
  const rootItems = useFileSystemStore((state) => state.rootItems);

  const fileSystemItems = useMemo(
    () => rootItems.map((id) => items[id]).filter(Boolean),
    [items, rootItems]
  );

  const sortedItems = useSortedItems(fileSystemItems);

  const selectRange = useSelectionStore((state) => state.selectRange);
  const lastSelectedId = useSelectionStore((state) => state.lastSelectedId);

  useEffect(() => {
    selectRange(fileSystemItems as SelectableItem[]);
  }, [lastSelectedId, fileSystemItems, selectRange]);

  useKeyboardShortcuts((selectedIds) => {
    console.log("Deleting items:", Array.from(selectedIds));
  });

  useEffect(() => {
    useSelectionStore.getState().setVisibleItems(fileSystemItems);
  }, [fileSystemItems]);

  const handleOpen = useCallback((id: string) => {
    console.log(`Opening item with id: ${id}`);
  }, []);

  const viewType = useViewPreferencesStore((state) => state.viewType);
  const folderArrangement = useSortPreferencesStore(
    (state) => state.folderArrangement
  );

  const folderItems = useMemo(
    () => sortedItems.filter((item) => item.type === "folder"),
    [sortedItems]
  );

  const fileItems = useMemo(
    () => sortedItems.filter((item) => item.type === "document"),
    [sortedItems]
  );

  return (
    <SidebarProvider className="flex flex-col">
      <FileSystemDndProvider>
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <SiteHeader />
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <section className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6">
                  {folderArrangement === "separated" ? (
                    <>
                      {folderItems.length > 0 && (
                        <section className="flex flex-col gap-4">
                          <h2 className="text-lg font-medium">Folders</h2>
                          <CardGrid
                            items={folderItems}
                            viewType={viewType}
                            users={USERS}
                            onOpen={handleOpen}
                          />
                        </section>
                      )}

                      {fileItems.length > 0 && (
                        <section className="flex flex-col gap-4">
                          <h2 className="text-lg font-medium">Files</h2>
                          <CardGrid
                            items={fileItems}
                            viewType={viewType}
                            users={USERS}
                            onOpen={handleOpen}
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
                        users={USERS}
                        onOpen={handleOpen}
                      />
                    </section>
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
            <SiteFooter />
          </SidebarInset>
        </div>
      </FileSystemDndProvider>
    </SidebarProvider>
  );
}
