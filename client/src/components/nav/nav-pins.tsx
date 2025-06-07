import {
  ExternalLink,
  File,
  Folder,
  FolderOpen,
  Loader2,
  MoreHorizontal,
  Pin,
  PinOff,
} from "lucide-react";

import { useUpdateFile } from "@/api/file/file.query";
import { usePinContents, useUpdateFolder } from "@/api/folder/folder.query";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useDialogStore } from "@/stores/useDialogStore";
import type { FileResponseDto } from "@/types/file.dto";
import type { FolderResponseDto } from "@/types/folder.dto";
import { Link, useLocation, useNavigate, useMatchRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PinItemProps {
  item: {
    id: string;
    name: string;
    type: "folder" | "file";
    url: string;
    icon: any;
    parentId?: string | null;
  };
}

// Helper function to keep menu options consistent between dropdown and context menu
const MenuItems = ({ item }: PinItemProps) => {
  const navigate = useNavigate();
  const updateFolderMutation = useUpdateFolder();
  const updateFileMutation = useUpdateFile();

  const handleOpenInNewTab = () => {
    window.open(item.url, "_blank");
  };

  const handleShowInEnclosingFolder = () => {
    if (item.type === "folder" && item.parentId) {
      navigate({ to: `/folder/${item.parentId}` });
    } else if (item.type === "file" && item.parentId) {
      navigate({ to: `/folder/${item.parentId}` });
    } else {
      // Navigate to root if no parent
      navigate({ to: "/" });
    }
  };

  const handleUnpin = async () => {
    try {
      if (item.type === "folder") {
        await updateFolderMutation.mutateAsync({
          folderId: item.id,
          data: { isPinned: false },
        });
        toast.success(`${item.name} unpinned successfully`);
      } else {
        await updateFileMutation.mutateAsync({
          fileId: item.id,
          data: { isPinned: false },
        });
        toast.success(`${item.name} unpinned successfully`);
      }
    } catch (error) {
      toast.error(`Failed to unpin ${item.name}`);
    }
  };

  return (
    <>
      <ContextMenuItem onClick={handleOpenInNewTab}>
        <ExternalLink className="text-muted-foreground mr-2 h-4 w-4" />
        <span>Open in New Tab</span>
      </ContextMenuItem>
      <ContextMenuItem onClick={handleShowInEnclosingFolder}>
        <FolderOpen className="text-muted-foreground mr-2 h-4 w-4" />
        <span>Show in Enclosing Folder</span>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={handleUnpin}>
        <PinOff className="text-muted-foreground mr-2 h-4 w-4" />
        <span>Unpin</span>
      </ContextMenuItem>
    </>
  );
};

const DropdownMenuOptions = ({ item }: PinItemProps) => {
  const navigate = useNavigate();
  const updateFolderMutation = useUpdateFolder();
  const updateFileMutation = useUpdateFile();

  const handleOpenInNewTab = () => {
    window.open(item.url, "_blank");
  };

  const handleShowInEnclosingFolder = () => {
    if (item.type === "folder" && item.parentId) {
      navigate({ to: `/folder/${item.parentId}` });
    } else if (item.type === "file" && item.parentId) {
      navigate({ to: `/folder/${item.parentId}` });
    } else {
      // Navigate to root if no parent
      navigate({ to: "/" });
    }
  };

  const handleUnpin = async () => {
    try {
      if (item.type === "folder") {
        await updateFolderMutation.mutateAsync({
          folderId: item.id,
          data: { isPinned: false },
        });
        toast.success(`${item.name} unpinned successfully`);
      } else {
        await updateFileMutation.mutateAsync({
          fileId: item.id,
          data: { isPinned: false },
        });
        toast.success(`${item.name} unpinned successfully`);
      }
    } catch (error) {
      toast.error(`Failed to unpin ${item.name}`);
    }
  };

  return (
    <>
      <DropdownMenuItem onClick={handleOpenInNewTab}>
        <ExternalLink className="text-muted-foreground mr-2 h-4 w-4" />
        <span>Open in New Tab</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleShowInEnclosingFolder}>
        <FolderOpen className="text-muted-foreground mr-2 h-4 w-4" />
        <span>Show in Enclosing Folder</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleUnpin}>
        <PinOff className="text-muted-foreground mr-2 h-4 w-4" />
        <span>Unpin</span>
      </DropdownMenuItem>
    </>
  );
};

export function NavPins() {
  const { isTablet } = useSidebar();
  const [currentOffset, setCurrentOffset] = useState(0);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const limit = 10;
  const location = useLocation();
  const matchRoute = useMatchRoute();
  const { openFilePreviewDialog } = useDialogStore();

  const { data, isLoading, error } = usePinContents(currentOffset, limit);
  const pinContents = data?.data?.folderContents;
  const pagination = data?.data?.pagination;

  // Handle file click to show preview
  const handleFileClick = (e: React.MouseEvent, file: FileResponseDto) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get all files from the pinned items
    const allFiles = allItems
      .filter(item => item.type === "file")
      .map(item => item.data);
    
    // Find the current file index
    const currentIndex = allFiles.findIndex(f => f.id === file.id);
    
    // Open file preview dialog with all pinned files
    openFilePreviewDialog(allFiles, currentIndex !== -1 ? currentIndex : 0);
  };

  // Process new items when data changes
  useEffect(() => {
    if (pinContents) {
      const newItems = [
        ...(pinContents.folders || []).map((folder: FolderResponseDto) => {
          const isCurrentFolder = location.pathname === `/folder/${folder.id}`;
          return {
            id: folder.id,
            name: folder.name,
            type: "folder" as const,
            url: `/folder/${folder.id}`,
            icon: isCurrentFolder ? FolderOpen : Folder,
            parentId: folder.parent,
            data: folder,
          };
        }),
        ...(pinContents.files || []).map((file: FileResponseDto) => ({
          id: file.id,
          name: file.extension ? `${file.name}.${file.extension}` : file.name,
          type: "file" as const,
          url: `/file/${file.id}`,
          icon: File,
          parentId: file.folder,
          data: file,
        })),
      ];

      if (currentOffset === 0) {
        // First load or reset
        setAllItems(newItems);
      } else {
        // Append new items, avoiding duplicates
        setAllItems((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const uniqueNewItems = newItems.filter(
            (item) => !existingIds.has(item.id)
          );
          return [...prev, ...uniqueNewItems];
        });
      }
    }
  }, [pinContents, location.pathname]);

  // Update folder icons when location changes
  useEffect(() => {      setAllItems((prev) =>
        prev.map((item) => {
          if (item.type === "folder") {
            const isCurrentFolder = location.pathname === `/folder/${item.id}`;
            return {
              ...item,
              icon: isCurrentFolder ? FolderOpen : Folder,
            };
          }
          return item;
        })
      );
  }, [location.pathname]);

  // Show only first 10 items unless expanded
  const displayItems = isExpanded ? allItems : allItems.slice(0, limit);

  const handleLoadMore = () => {
    if (pagination?.hasMore) {
      setCurrentOffset((prev) => prev + limit);
      setIsExpanded(true);
    }
  };

  const handleShowLess = () => {
    setCurrentOffset(0);
    setIsExpanded(false);
    setAllItems((prev) => prev.slice(0, limit));
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Pinned</SidebarGroupLabel>
      <SidebarMenu>
        {isLoading && currentOffset === 0 && (
          <SidebarMenuItem>
            <SidebarGroupLabel>
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-primary" />
              <span className="sr-only">Loading Pins</span>
            </SidebarGroupLabel>
          </SidebarMenuItem>
        )}

        {error && (
          <SidebarMenuItem>
            <SidebarGroupLabel>
              <span className="text-destructive font-light mx-auto">
                Error loading pins
              </span>
            </SidebarGroupLabel>
          </SidebarMenuItem>
        )}

        {displayItems.map((item) => {
          const isActive = !!matchRoute({ to: item.url, fuzzy: true });
          
          return (
            <ContextMenu key={item.id}>
              <ContextMenuTrigger asChild>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={item.name} isActive={isActive}>
                    {item.type === "file" ? (
                      <button
                        onClick={(e) => handleFileClick(e, item.data)}
                        className="w-full flex items-center gap-2 text-left"
                      >
                        <item.icon />
                        <span className="truncate overflow-hidden selection:bg-transparent">
                          {item.name}
                        </span>
                      </button>
                    ) : (
                      <Link to={item.url}>
                        <item.icon />
                        <span className="truncate overflow-hidden selection:bg-transparent">
                          {item.name}
                        </span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction showOnHover>
                        <MoreHorizontal />
                        <span className="sr-only">More</span>
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-min-48"
                      side={isTablet ? "bottom" : "right"}
                      align={isTablet ? "end" : "start"}
                    >
                      <DropdownMenuOptions item={item} />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </ContextMenuTrigger>
              <ContextMenuContent className="min-w-48">
                <MenuItems item={item} />
              </ContextMenuContent>
            </ContextMenu>
          );
        })}

        {/* Show Load More button if there are more items and not expanded beyond initial load */}
        {pagination?.hasMore && !isExpanded && (
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLoadMore}
              disabled={isLoading}
              tooltip="More Pins"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pin className="rotate-20" />
              )}
              <span>More Pins</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {/* Show Show Less button if expanded and showing more than initial limit */}
        {isExpanded && allItems.length > limit && (
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleShowLess} tooltip="Less Pins">
              <Pin className="rotate-20" />
              <span>Show Less</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
