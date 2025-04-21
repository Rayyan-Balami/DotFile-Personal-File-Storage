import { ChevronRight, File, Folder, MoreHorizontal } from "lucide-react"
import { 
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub 
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible"

export function NavFiles({
  treeData,
}: {
  treeData: (string | any[])[]
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Files</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {treeData.map((item, index) => (
            <NavTree key={index} item={item} />
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton>
              <MoreHorizontal />
              <span>More</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function NavTree({ item }: { item: string | any[] }) {
  const [name, ...items] = Array.isArray(item) ? item : [item]
  if (!items.length) {
    return (
      <SidebarMenuButton
      >
        <File />
        {name}
      </SidebarMenuButton>
    )
  }
  return (
    <Collapsible
      className="group-data-[collapsible=icon]:hidden"
      defaultOpen={false}
      asChild
      data-state="closed"
      data-collapsed="true"
    >
      <SidebarMenuItem className="overflow-x-scroll">
        <CollapsibleTrigger asChild>
          <SidebarMenuAction className="data-[state=open]:rotate-90 left-1 right-0">
            <ChevronRight className="transition-transform" />
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <SidebarMenuButton asChild tooltip={name} className="group-has-data-[sidebar=menu-action]/menu-item:pr-2 group-has-data-[sidebar=menu-action]/menu-item:pl-8">
          <a href="#">
            <Folder />
            <span className="truncate overflow-hidden">{name}</span>
          </a>
        </SidebarMenuButton>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((subItem, index) => (
              <NavTree key={index} item={subItem} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}