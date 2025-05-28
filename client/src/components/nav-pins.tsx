import {
  Folder,
  MoreHorizontal,
  File,
  Loader2,
  ExternalLink,
  FolderOpen,
  PinOff,
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
import { Link, useNavigate } from "@tanstack/react-router"
import { usePinContents, useUpdateFolder } from "@/api/folder/folder.query"
import { useUpdateFile } from "@/api/file/file.query"
import { useState } from "react"
import type { FolderResponseDto } from "@/types/folder.dto"
import type { FileResponseDto } from "@/types/file.dto"
import { toast } from "sonner"

interface PinItemProps {
  item: {
    id: string
    name: string
    type: 'folder' | 'file'
    url: string
    icon: any
    parentId?: string | null
  }
}

// Helper function to keep menu options consistent between dropdown and context menu
const MenuItems = ({ item }: PinItemProps) => {
  const navigate = useNavigate()
  const updateFolderMutation = useUpdateFolder()
  const updateFileMutation = useUpdateFile()

  const handleOpenInNewTab = () => {
    window.open(item.url, '_blank')
  }

  const handleShowInEnclosingFolder = () => {
    if (item.type === 'folder' && item.parentId) {
      navigate({ to: `/folder/${item.parentId}` })
    } else if (item.type === 'file' && item.parentId) {
      navigate({ to: `/folder/${item.parentId}` })
    } else {
      // Navigate to root if no parent
      navigate({ to: '/' })
    }
  }

  const handleUnpin = async () => {
    try {
      if (item.type === 'folder') {
        await updateFolderMutation.mutateAsync({
          folderId: item.id,
          data: { isPinned: false }
        })
        toast.success(`${item.name} unpinned successfully`)
      } else {
        await updateFileMutation.mutateAsync({
          fileId: item.id,
          data: { isPinned: false }
        })
        toast.success(`${item.name} unpinned successfully`)
      }
    } catch (error) {
      toast.error(`Failed to unpin ${item.name}`)
    }
  }

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
  )
}

const DropdownMenuOptions = ({ item }: PinItemProps) => {
  const navigate = useNavigate()
  const updateFolderMutation = useUpdateFolder()
  const updateFileMutation = useUpdateFile()

  const handleOpenInNewTab = () => {
    window.open(item.url, '_blank')
  }

  const handleShowInEnclosingFolder = () => {
    if (item.type === 'folder' && item.parentId) {
      navigate({ to: `/folder/${item.parentId}` })
    } else if (item.type === 'file' && item.parentId) {
      navigate({ to: `/folder/${item.parentId}` })
    } else {
      // Navigate to root if no parent
      navigate({ to: '/' })
    }
  }

  const handleUnpin = async () => {
    try {
      if (item.type === 'folder') {
        await updateFolderMutation.mutateAsync({
          folderId: item.id,
          data: { isPinned: false }
        })
        toast.success(`${item.name} unpinned successfully`)
      } else {
        await updateFileMutation.mutateAsync({
          fileId: item.id,
          data: { isPinned: false }
        })
        toast.success(`${item.name} unpinned successfully`)
      }
    } catch (error) {
      toast.error(`Failed to unpin ${item.name}`)
    }
  }

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
  )
}

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
      icon: Folder,
      parentId: folder.parent
    })),
    ...(pinContents?.files || []).map((file: FileResponseDto) => ({
      id: file.id,
      name: file.name,
      type: 'file' as const,
      url: `/file/${file.id}`,
      icon: File,
      parentId: file.folder
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
                    <DropdownMenuOptions item={item} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </ContextMenuTrigger>
            <ContextMenuContent className="min-w-48">
              <MenuItems item={item} />
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