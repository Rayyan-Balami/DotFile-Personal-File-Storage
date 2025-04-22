import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useEffect } from "react";
import { SiteHeader } from "./components/footer/site-footer";
import { SiteFooter } from "./components/header/site-header";
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
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const LazyGlobalMenuItems = lazy(() =>
  import("@/components/context/GlobalMenuItems").then((module) => ({
    default: module.ContextMenuItems,
  }))
);

export default function Page() {
  // Prevent right-click context menu of the browser in entire app
  useEffect(() => {
    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", disableRightClick);

    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
    };
  }, []);

  // Sample data with unique IDs
  const cardData = [
    // Folders
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
    // Documents without preview
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
    // Documents with preview
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

  const users = [
    { image: "https://github.com/shadcn.png", fallback: "CN" },
    { image: "https://github.com/shadcn.png", fallback: "CN" },
    { image: "https://github.com/shadcn.png", fallback: "CN" },
    { fallback: "+3" },
  ];

  // Initialize file system store with items
  useEffect(() => {
    initializeFileSystem(cardData);
  }, []);

  // Get items from the file system store
  const items = useFileSystemStore((state) => state.items);
  const rootItems = useFileSystemStore((state) => state.rootItems);
  const fileSystemItems = rootItems.map((id) => items[id]).filter(Boolean);

  const selectRange = useSelectionStore((state) => state.selectRange);

  // Support for shift+click range selection
  useEffect(() => {
    selectRange(fileSystemItems as SelectableItem[]);
  }, [useSelectionStore((state) => state.lastSelectedId)]);

  // Set up keyboard shortcuts with custom delete handler
  useKeyboardShortcuts((selectedIds) => {
    console.log("Deleting items:", Array.from(selectedIds));
    // Call your API or dispatch deletion action
  });

  // When your items list changes, make sure to update the visible items
  useEffect(() => {
    useSelectionStore.getState().setVisibleItems(fileSystemItems);
  }, [fileSystemItems]);

  const handleOpen = (id: string) => {
    console.log(`Opening item with id: ${id}`);
  };

  return (
    <SidebarProvider className="flex flex-col">
      <FileSystemDndProvider>
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <SiteHeader />
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  {/* large folders section */}
                  <section className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6">


                    <section className="flex flex-1 flex-col gap-4">
                      <h2 className="text-lg font-medium">Large</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4 lg:gap-6">
                        {fileSystemItems.map((item) => (
                          <DraggableFolderCard
                            key={item.id}
                            id={item.id}
                            variant="compact"
                            type={item.type}
                            color={item.color ?? "default"}
                            title={item.title}
                            itemCount={item.itemCount}
                            users={users}
                            isPinned={item.id.includes("-2")}
                            fileExtension={item.fileExtension || "pdf"}
                            previewUrl={item.previewUrl}
                            onOpen={() => handleOpen(item.id)}
                          />
                        ))}
                      </div>
                    </section>
                  </section>
                </ContextMenuTrigger>
                <ContextMenuContent>
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
