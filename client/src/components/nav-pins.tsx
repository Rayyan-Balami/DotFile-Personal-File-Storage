import {
  Folder,
  MoreHorizontal,
  Share,
  Trash2,
  File,
  Loader2,
  Pin,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Link } from "@tanstack/react-router"
import { usePinContents } from "@/api/folder/folder.query"
import { useState } from "react"
import type { FolderResponseDto } from "@/types/folder.dto"
import type { FileResponseDto } from "@/types/file.dto"

// Helper function to keep menu options consistent between dropdown and context menu
const MenuItems = () => (
  <>
    <ContextMenuItem>
      <Pin className="text-muted-foreground mr-2 h-4 w-4 rotate-20" />
      <span>Open in New Tab</span>
    </ContextMenuItem>
    <ContextMenuItem>
      <Pin className="text-muted-foreground mr-2 h-4 w-4 rotate-20" />
      <span>Show in Enclosing Folder</span>
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem>
      <Pin className="text-muted-foreground mr-2 h-4 w-4 rotate-20" />
      <span>Unpin</span>
    </ContextMenuItem>
  </>
)

const DropdownMenuOptions = () => (
  <>
    <DropdownMenuItem>
      <Pin className="text-muted-foreground mr-2 h-4 w-4 rotate-20" />
      <span>Open in New Tab</span>
    </DropdownMenuItem>

    <DropdownMenuItem>
      <Pin className="text-muted-foreground mr-2 h-4 w-4 rotate-20" />
      <span>Show in Enclosing Folder</span>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Pin className="text-muted-foreground mr-2 h-4 w-4 rotate-20" />
      <span>Unpin</span>
    </DropdownMenuItem>
  </>
)

export function NavPins() {
  const { isMobile } = useSidebar()
  const [currentOffset, setCurrentOffset] = useState(0)
  const limit = 10
  
  const { data, isLoading, error } = usePinContents(currentOffset, limit)
  const pinContents = data?.data?.folderContents
  const pagination = data?.data?.pagination
  
  // Combine folders and files into a single array for display
  const pinnedItems = [
    ...(pinContents?.folders || []).map((folder: FolderResponseDto) => ({
      id: folder.id,
      name: folder.name,
      type: 'folder' as const,
      url: `/folder/${folder.id}`,
      icon: Folder
    })),
    ...(pinContents?.files || []).map((file: FileResponseDto) => ({
      id: file.id,
      name: file.name,
      type: 'file' as const,
      url: `/file/${file.id}`,
      icon: File
    }))
  ]

  const handleLoadMore = () => {
    if (pagination?.hasMore) {
      setCurrentOffset(prev => prev + limit)
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Pinned</SidebarGroupLabel>
      <SidebarMenu>
        { isLoading && currentOffset === 0 && (
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
              <span className="text-destructive font-light mx-auto">Error loading pins</span>
            </SidebarGroupLabel>
          </SidebarMenuItem>
        )}
        
        {pinnedItems.map((item) => (
          <ContextMenu key={item.id}>
            <ContextMenuTrigger asChild>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={item.name}>
                  <Link to={item.url}>
                    <item.icon />
                    <span className="truncate overflow-hidden selection:bg-transparent">{item.name}</span>
                  </Link>
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
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuOptions />
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </ContextMenuTrigger>
            <ContextMenuContent className="min-w-48">
              <MenuItems />
            </ContextMenuContent>
          </ContextMenu>
        ))}
        
        {pagination?.hasMore && (
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLoadMore}
              disabled={isLoading}
              tooltip="Load More Pins"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal />
              )}
              <span>Load More</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}