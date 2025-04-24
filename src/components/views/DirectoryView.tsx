import { useSortPreferencesStore } from "@/store/useSortPreferencesStore";
import { useViewPreferencesStore } from "@/store/useViewPreferencesStore";
import { useSortedItems } from "@/utils/sortUtils";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@radix-ui/react-context-menu";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useMemo } from "react";
import { FileDropZone } from "../dnd/FileDropZone";
import { CardGrid } from "./CardGrid";

// Define USERS constant for avatars
const USERS = [
  { image: "https://github.com/shadcn.png", fallback: "CN" },
  { image: "https://github.com/shadcn.png", fallback: "CN" },
  { image: "https://github.com/shadcn.png", fallback: "CN" },
  { fallback: "+3" },
];

// Lazy load context menu items
const LazyGlobalMenuItems = lazy(() =>
  import("@/components/menuItems/GlobalMenuItems").then((module) => ({
    default: module.ContextMenuItems,
  }))
);

export default function DirectoryView({ 
  items = [], 
  currentPath = '/', 
  directoryName = 'Directory',
  parentId = null 
}) {
  const navigate = useNavigate();
  
  // Apply sorting
  const sortedItems = useSortedItems(items);
  
  // Get view preferences
  const viewType = useViewPreferencesStore((state) => state.viewType);
  const folderArrangement = useSortPreferencesStore(
    (state) => state.folderArrangement
  );

  // Handle item open
  const handleOpen = (id) => {
    const item = items.find(item => item.id === id);
    if (!item) return;
    
    if (item.type === 'folder') {
      navigate({ to: '/folder/$id', params: { id: id } });
    } else {
      console.log(`Opening document with id: ${id}`);
      // Implement document opening logic here
    }
  };

  // For going back to files - update to handle parent folders
  const handleBackToFiles = () => {
    if (currentPath === '/') return;
    
    // If we have a parentId, navigate to that folder
    if (parentId) {
      navigate({ to: '/folder/$id', params: { id: parentId } });
    } else {
      // Otherwise go back to root
      navigate({ to: '/' });
    }
  };
  
  // Separate folders and files if needed
  const folderSubItems = useMemo(
    () => sortedItems.filter((item) => item.type === "folder"),
    [sortedItems]
  );

  const fileItems = useMemo(
    () => sortedItems.filter((item) => item.type === "document"),
    [sortedItems]
  );
  
  
  return (
    <FileDropZone>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <section className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6">
            
            <div className="mb-2">
              {currentPath !== '/' && (
                <button 
                  onClick={handleBackToFiles}
                  className="text-sm text-muted-foreground hover:underline mb-2 flex items-center"
                >
                  ← Back to root
                </button>
              )}
              
              <h1 className="text-2xl font-bold">
                {directoryName}
              </h1>
              <p className="text-muted-foreground">
                {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            
            {folderArrangement === "separated" ? (
              <>
                {folderSubItems.length > 0 && (
                  <section className="flex flex-col gap-4 mb-6">
                    <h2 className="text-lg font-medium">Folders</h2>
                    <CardGrid
                      items={folderSubItems}
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