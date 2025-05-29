import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import { Upload } from "lucide-react";

export function NavUpload() {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Upload"
              variant="outline"
              className="w-full justify-center border bg-primary/10 hover:bg-primary/20 border-primary-foreground/30 text-primary-foreground hover:text-primary-foreground
              dark:bg-primary-foreground/20
              dark:hover:bg-primary-foreground/30
              dark:border-primary/30
              dark:text-primary
              dark:hover:text-primary
              cursor-pointer"
            >
              <Upload />
              <span>Upload</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
