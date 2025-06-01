import {
  Clock,
  Database,
  FolderClosed,
  PanelRightClose,
  Trash2,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import { NavColors } from "./nav-colors";
import { NavPins } from "./nav-pins";
import { Button } from "./ui/button";
import { VITE_APP_NAME, VITE_APP_VERSION } from "@/config/constants";
import { NavUpload } from "./nav-upload";

const data = {
  navMain: [
    {
      title: "Recent",
      url: "/recent",
      icon: Clock,
    },
    {
      title: "My Drive",
      url: "/",
      icon: FolderClosed,
    },
    {
      title: "Trash",
      url: "/trash",
      icon: Trash2,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { toggleSidebar, state, isMobile } = useSidebar();
  return (
    <Sidebar
      className="border-muted-foreground/15"
      collapsible={"icon"}
      {...props}
    >
      {state === "collapsed" && !isMobile && (
        <Button
          className="group/toggle h-(--header-height) w-[3rem] rounded-none text-sidebar-foreground hover:text-primary "
          variant="ghost"
          onClick={toggleSidebar}
        >
          <PanelRightClose className="size-4.25 group-hover/toggle:scale-105 transition-transform" />
        </Button>
      )}
      <SidebarHeader>
        <SidebarMenu
          className={state === "collapsed" && !isMobile ? "gap-2" : ""}
        >
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip=".File">
              <Link to="/">
                <section className="bg-primary text-white flex aspect-square size-8 items-center justify-center rounded-lg font-serif text-lg">
                  <Database className="size-4 text-primary-foreground" />
                </section>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">.File</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <NavUser />
        </SidebarMenu>
        <SidebarSeparator />
      </SidebarHeader>
      <SidebarContent>
        <NavUpload />
        <NavMain items={data.navMain} />
        <NavPins />
      </SidebarContent>
      <SidebarFooter className="min-h-(--footer-height)">
        <NavColors />
        {/* copyright */}
        {(state !== "collapsed" || isMobile) && (
          <div className="text-muted-foreground text-[11px] text-center w-full block leading-tight pb-2">
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-foreground">
              {VITE_APP_NAME}
            </span>{" "}
            <span>{VITE_APP_VERSION}</span>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
