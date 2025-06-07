import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
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
import { NavColors } from "@/components/user-nav/nav-colors";
import { NavMain } from "@/components/user-nav/nav-main";
import { NavPins } from "@/components/user-nav/nav-pins";
import { NavUpload } from "@/components/user-nav/nav-upload";
import { NavUser } from "@/components/user-nav/nav-user";
import { VITE_APP_DESCRIPTION, VITE_APP_NAME, VITE_APP_VERSION } from "@/config/constants";
import { Link } from "@tanstack/react-router";
import {
  PanelRightClose
} from "lucide-react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { toggleSidebar, state, isTablet } = useSidebar();
  return (
    <Sidebar
      className="border-muted-foreground/15"
      collapsible={"icon"}
      {...props}
    >
      {state === "collapsed" && !isTablet && (
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
          className={state === "collapsed" && !isTablet ? "gap-2" : ""}
        >
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={VITE_APP_NAME}>
              <Link to="/">
                <section className="bg-primary flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Logo />
                </section>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium uppercase">{VITE_APP_NAME}</span>
                  <span className="truncate text-xs">{VITE_APP_DESCRIPTION}</span>
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
        <NavMain />
        <NavPins />
      </SidebarContent>
      <SidebarFooter className="min-h-(--footer-height)">
        <NavColors />
        {/* copyright */}
        {(state !== "collapsed" || isTablet) && (
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
