import { Circle, LampDesk, MoreHorizontal, Squircle, Trash2 } from "lucide-react"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

// Context menu options
const ContextMenuOptions = () => (
  <>
    <ContextMenuItem>
      <LampDesk className="text-muted-foreground mr-2 h-4 w-4" />
      <span>View Desk Files</span>
    </ContextMenuItem>
    <ContextMenuItem>
      <Squircle className="text-muted-foreground mr-2 h-4 w-4" />
      <span>Change Color</span>
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem>
      <Trash2 className="text-muted-foreground mr-2 h-4 w-4" />
      <span>Delete Desk</span>
    </ContextMenuItem>
  </>
)

// Dropdown menu options
const DropdownMenuOptions = () => (
  <>
    <DropdownMenuItem>
      <LampDesk className="text-muted-foreground mr-2 h-4 w-4" />
      <span>View Desk Files</span>
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Squircle className="text-muted-foreground mr-2 h-4 w-4" />
      <span>Change Color</span>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Trash2 className="text-muted-foreground mr-2 h-4 w-4" />
      <span>Delete Desk</span>
    </DropdownMenuItem>
  </>
)

// Single desk item component
const DeskItem = ({ 
  item, 
  isMobile 
}: { 
  item: { 
    name: string; 
    url: string; 
    colorClass: string 
    icon: LucideIcon
  }; 
  isMobile: boolean 
}) => (
  <ContextMenu key={item.name}>
    <ContextMenuTrigger asChild>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={item.name}>
          <Link to={item.url}>
            <item.icon className={`${item.colorClass} h-4 w-4`} />
            <span className="truncate overflow-hidden">{item.name}</span>
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
      <ContextMenuOptions />
    </ContextMenuContent>
  </ContextMenu>
)

export function NavDesks({
  items,
}: {
  items: {
    name: string
    url: string
    colorClass: string
    icon: LucideIcon
  }[]
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Desks</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((desk) => (
          <DeskItem key={desk.name} item={desk} isMobile={isMobile} />
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="More Desks">
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