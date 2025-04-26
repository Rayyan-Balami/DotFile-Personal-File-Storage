import {
  Folder,
  MoreHorizontal,
  Share,
  Trash2,
  type LucideIcon,
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

// Helper function to keep menu options consistent between dropdown and context menu
const MenuItems = () => (
  <>
    <ContextMenuItem>
      <Folder className="text-muted-foreground mr-2 h-4 w-4" />
      <span>View Project</span>
    </ContextMenuItem>
    <ContextMenuItem>
      <Share className="text-muted-foreground mr-2 h-4 w-4" />
      <span>Share Project</span>
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem>
      <Trash2 className="text-muted-foreground mr-2 h-4 w-4" />
      <span>Delete Project</span>
    </ContextMenuItem>
  </>
)

const DropdownMenuOptions = () => (
  <>
    <DropdownMenuItem>
      <Folder className="text-muted-foreground mr-2 h-4 w-4" />
      <span>View Project</span>
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Share className="text-muted-foreground mr-2 h-4 w-4" />
      <span>Share Project</span>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Trash2 className="text-muted-foreground mr-2 h-4 w-4" />
      <span>Delete Project</span>
    </DropdownMenuItem>
  </>
)

export function NavProjects({
  projects,
}: {
  projects: {
    name: string
    url: string
    icon: LucideIcon
  }[]
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Pinned</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => (
          <ContextMenu key={item.name}>
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
                    className="w-48"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuOptions />
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <MenuItems />
            </ContextMenuContent>
          </ContextMenu>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="More Projects">
            <Link to="/">
            <MoreHorizontal />
            <span>More</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}